require('dotenv').config();
const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(cors())
app.use(express.json())

const conexao = require("./db.js")
const porta = 3000
const api_chave = process.env.JWT_SECRET;
if (!api_chave) throw new Error('JWT_SECRET não definido no arquivo .env');

const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./swagger.json')

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`)
    console.log(`Documentação Swagger: http://localhost:${porta}/api-docs`)
})

function autenticar(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Token não fornecido" });
    try {
        req.usuario = jwt.verify(token, api_chave);
        next();
    } catch {
        res.status(401).json({ error: "Token inválido" });
    }
}

function autorizar(...perfis) {
    return (req, res, next) => {
        if (!perfis.includes(req.usuario.perfil)) {
            return res.status(403).json({ error: "Acesso negado para seu perfil" });
        }
        next();
    };
}


// Resolve IDs and prices exclusively from the database; never trust client-sent values.
async function obterServicosDoBanco(ids, db = conexao) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Selecione ao menos um serviço.');
    const idsNumericos = [...new Set(ids.map(item => Number(typeof item === 'object' ? (item.tipo_servico ?? item.id_servicos) : item)))];
    if (idsNumericos.some(id => !Number.isInteger(id) || id <= 0)) throw new Error('ID de serviço inválido.');
    const placeholders = idsNumericos.map(() => '?').join(',');
    const [rows] = await db.execute(
        `SELECT id_servicos, nome, preco, duracao, pontos FROM servicos WHERE status = 1 AND id_servicos IN (${placeholders})`,
        idsNumericos
    );
    if (rows.length !== idsNumericos.length) throw new Error('Um ou mais serviços não existem ou estão inativos.');
    return rows;
}

async function validarConflitoHorario(idFuncionario, data, servicosBanco, idIgnorar = null, db = conexao) {
    const inicioNovo = new Date(data);
    if (Number.isNaN(inicioNovo.getTime())) throw new Error('Data/hora inválida.');
    const duracaoNova = servicosBanco.reduce((s, item) => s + Number(item.duracao), 0);
    if (duracaoNova <= 0) throw new Error('Duração dos serviços inválida.');
    const fimNovo = new Date(inicioNovo.getTime() + duracaoNova * 60000);
    const params = [idFuncionario];
    let sql = `SELECT a.id, a.data, COALESCE(SUM(s.duracao), 0) AS duracao
        FROM agendamentos a
        LEFT JOIN agendavalor av ON av.id_agendamento = a.id
        LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
        WHERE a.id_funcionario = ? AND a.status <> 'cancelado'`;
    if (idIgnorar) { sql += ' AND a.id <> ?'; params.push(idIgnorar); }
    sql += ' GROUP BY a.id, a.data';
    const [existentes] = await db.execute(sql, params);
    for (const ag of existentes) {
        const inicio = new Date(ag.data);
        const fim = new Date(inicio.getTime() + Number(ag.duracao || 0) * 60000);
        if (inicioNovo < fim && fimNovo > inicio) {
            throw new Error('Conflito de horário: o profissional já possui um agendamento nesse período.');
        }
    }
    return { duracao: duracaoNova, valor_total: servicosBanco.reduce((s, item) => s + Number(item.preco), 0) };
}

app.post('/cadastrar', async (req, res) => {
    try {
        const { nome_completo, cep, email, senha } = req.body;

        if (!nome_completo || !cep || !email) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios!" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Email inválido!" });
        }

        const cepDigits = String(cep).replace(/\D/g, '');
        if (cepDigits.length !== 8) {
            return res.status(400).json({ error: "CEP inválido! Deve conter 8 dígitos." });
        }

        const [existe] = await conexao.execute(
            'SELECT email FROM usuarios WHERE email = ?',
            [email]
        );

        if (existe.length > 0) {
            return res.status(400).json({ error: "Email já cadastrado!" });
        }

        let senhaHash = '';
        let primeiro_acesso = true;

        if (senha && senha.trim() !== '') {
            senhaHash = await bcrypt.hash(senha, 10);
            primeiro_acesso = false;
        }

        const [resultado] = await conexao.execute(
            'INSERT INTO usuarios (nome_completo, cep, email, senha, primeiro_acesso) VALUES (?, ?, ?, ?, ?)',
            [nome_completo, cep, email, senhaHash, primeiro_acesso]
        );

        res.json({
            insertId: resultado.insertId,
            mensagem: primeiro_acesso ?
                "Usuário criado! Ele precisará cadastrar uma senha no primeiro acesso." :
                "Usuário cadastrado com sucesso!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const [resultado] = await conexao.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (resultado.length === 0) {
            return res.status(404).json({ mensagem: "Email não encontrado!" });
        }

        const usuario = resultado[0];

        if (usuario.primeiro_acesso === 1 || !usuario.senha) {
            return res.status(403).json({
                mensagem: "Primeiro acesso! Cadastre sua senha.",
                primeiro_acesso: true,
                usuario_id: usuario.id_usuario,
                primeiro_acesso_token: jwt.sign(
                    { id_usuario: usuario.id_usuario, perfil: usuario.perfil, acao: 'primeiro_acesso' },
                    api_chave,
                    { expiresIn: '10m' }
                )
            });
        }

        const validou = await bcrypt.compare(senha, usuario.senha);

        if (!validou) {
            return res.status(401).json({ mensagem: "Email ou senha inválidos!" });
        }

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                email: usuario.email,
                nome: usuario.nome_completo,
                perfil: usuario.perfil
            },
            api_chave,
            { expiresIn: "2h" }
        );

        res.json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome_completo,
                email: usuario.email,
                cep: usuario.cep,
                foto_perfil: usuario.foto_perfil || null
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensagem: "Erro ao fazer login!" });
    }
});

app.get('/buscar', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const [resultado] = await conexao.query(
            'SELECT id_usuario, nome_completo, email, cep, primeiro_acesso FROM usuarios ORDER BY id_usuario DESC'
        );
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar usuários" });
    }
});

app.put('/atualizar', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { id_usuario, nome_completo, cep, email, senha } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Email inválido!" });
        }

        const cepDigits = String(cep).replace(/\D/g, '');
        if (cepDigits.length !== 8) {
            return res.status(400).json({ error: "CEP inválido! Deve conter 8 dígitos." });
        }

        let query = 'UPDATE usuarios SET nome_completo = ?, cep = ?, email = ?';
        const params = [nome_completo, cep, email];

        if (senha && senha.trim() !== '') {
            const hash = await bcrypt.hash(senha, 10);
            query += ', senha = ?, primeiro_acesso = 0';
            params.push(hash);
        }

        query += ' WHERE id_usuario = ?';
        params.push(id_usuario);

        const [resultado] = await conexao.execute(query, params);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.json({
            affectedRows: resultado.affectedRows,
            mensagem: "Usuário atualizado com sucesso!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
});

app.delete('/deletar', autenticar, autorizar('admin'), async (req, res) => {
    try {
        const { id_usuario } = req.body;

        const [agendamentosDoUsuario] = await conexao.execute(
            'SELECT id FROM agendamentos WHERE id_usuario = ?',
            [id_usuario]
        );
        for (const agendamento of agendamentosDoUsuario) {
            await conexao.execute('DELETE FROM agendavalor WHERE id_agendamento = ?', [agendamento.id]);
        }
        await conexao.execute('DELETE FROM agendamentos WHERE id_usuario = ?', [id_usuario]);
        await conexao.execute('DELETE FROM fidelidade WHERE id_usuario = ?', [id_usuario]);

        const [resultado] = await conexao.execute(
            'DELETE FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.json({
            affectedRows: resultado.affectedRows,
            mensagem: "Usuário deletado com sucesso!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao deletar usuário" });
    }
});

app.post('/esqueci-senha', async (req, res) => {
    const { email } = req.body;

    try {
        const [usuario] = await conexao.execute(
            'SELECT id_usuario, email, nome_completo FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuario.length === 0) {
            return res.json({ mensagem: "Solicitação recebida. Se a recuperação estiver configurada, você receberá instruções." });
        }

        const resetToken = jwt.sign(
            { id_usuario: usuario[0].id_usuario, email: usuario[0].email },
            api_chave,
            { expiresIn: "30min" }
        );

        await conexao.execute(
            'DELETE FROM reset_tokens WHERE id_usuario = ?',
            [usuario[0].id_usuario]
        );

        const expiraEm = new Date();
        expiraEm.setMinutes(expiraEm.getMinutes() + 30);

        await conexao.execute(
            'INSERT INTO reset_tokens (id_usuario, token, expira_em) VALUES (?, ?, ?)',
            [usuario[0].id_usuario, resetToken, expiraEm]
        );

        const resposta = {
            mensagem: "Se o e-mail estiver cadastrado, você receberá instruções para recuperar a senha."
        };

        // Somente para desenvolvimento local. Nunca habilite em produção.
        if (process.env.RESET_MODE === 'demo') {
            resposta.link_demo = `${process.env.RESET_DEMO_URL || 'http://localhost:5500/resetar.html'}?token=${encodeURIComponent(resetToken)}`;
        }

        res.json(resposta);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao processar solicitação" });
    }
});

app.post('/resetar-senha', async (req, res) => {
    const { token, nova_senha } = req.body;

    if (!nova_senha || nova_senha.trim() === '') {
        return res.status(400).json({ error: "Senha não pode estar vazia!" });
    }

    if (nova_senha.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres!" });
    }

    try {
        const [tokenValido] = await conexao.execute(
            'SELECT * FROM reset_tokens WHERE token = ? AND usado = 0 AND expira_em > NOW()',
            [token]
        );

        if (tokenValido.length === 0) {
            return res.status(400).json({ error: "Token inválido ou expirado! Solicite nova recuperação." });
        }

        const decoded = jwt.verify(token, api_chave);

        const hash = await bcrypt.hash(nova_senha, 10);

        await conexao.execute(
            'UPDATE usuarios SET senha = ?, primeiro_acesso = 0 WHERE id_usuario = ?',
            [hash, decoded.id_usuario]
        );

        await conexao.execute(
            'UPDATE reset_tokens SET usado = 1 WHERE token = ?',
            [token]
        );

        res.json({ mensagem: "Senha alterada com sucesso! Agora você pode fazer login." });
    } catch (error) {
        console.log(error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ error: "Token inválido!" });
        }
        res.status(500).json({ error: "Erro ao resetar senha" });
    }
});

app.post('/primeiro-acesso', autenticar, async (req, res) => {
    const { id_usuario, nova_senha } = req.body;

    if (req.usuario.acao !== 'primeiro_acesso' || Number(req.usuario.id_usuario) !== Number(id_usuario)) {
        return res.status(403).json({ error: 'Token de primeiro acesso inválido.' });
    }

    if (!nova_senha || nova_senha.trim() === '') {
        return res.status(400).json({ error: "Senha não pode estar vazia!" });
    }

    if (nova_senha.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres!" });
    }

    try {
        const hash = await bcrypt.hash(nova_senha, 10);

        const [resultado] = await conexao.execute(
            'UPDATE usuarios SET senha = ?, primeiro_acesso = 0 WHERE id_usuario = ? AND primeiro_acesso = 1',
            [hash, id_usuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Usuário não encontrado ou já possui senha!" });
        }

        res.json({ mensagem: "Senha cadastrada com sucesso! Agora você pode fazer login." });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao cadastrar senha" });
    }
});

// Todas as rotas operacionais abaixo exigem token JWT.
app.use(autenticar);

// Edição segura do próprio perfil pelo aplicativo: nome, CEP, senha e foto.
// O ID vem do JWT, não do corpo da requisição.
app.put('/perfil', async (req, res) => {
    try {
        const idUsuario = Number(req.usuario.id_usuario);
        const { nome_completo, cep, senha_atual, nova_senha, foto_perfil } = req.body;
        const [rows] = await conexao.execute(
            'SELECT id_usuario, senha FROM usuarios WHERE id_usuario = ?', [idUsuario]
        );
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const campos = [];
        const params = [];
        const usuarioAtualizado = {};

        if (nome_completo !== undefined) {
            const nome = String(nome_completo).trim().replace(/\s+/g, ' ');
            if (nome.length < 6) return res.status(400).json({ error: 'O nome deve ter pelo menos 6 caracteres.' });
            if (!/^[A-Za-zÀ-ÿ\s]+$/.test(nome)) return res.status(400).json({ error: 'O nome deve conter apenas letras.' });
            campos.push('nome_completo = ?');
            params.push(nome);
            usuarioAtualizado.nome = nome;
        }

        if (cep !== undefined) {
            const cepTexto = String(cep).trim();
            if (!/^\d{5}-?\d{3}$/.test(cepTexto)) return res.status(400).json({ error: 'Digite um CEP válido.' });
            const cepNumeros = cepTexto.replace(/\D/g, '');
            campos.push('cep = ?');
            params.push(cepNumeros);
            usuarioAtualizado.cep = cepNumeros;
        }

        if (nova_senha !== undefined) {
            const senhaAtual = String(senha_atual || '').trim();
            const novaSenha = String(nova_senha).trim();
            if (!senhaAtual) return res.status(400).json({ error: 'Informe sua senha atual.' });
            if (!rows[0].senha || !(await bcrypt.compare(senhaAtual, rows[0].senha))) {
                return res.status(401).json({ error: 'Senha atual incorreta.' });
            }
            if (novaSenha.length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
            if (novaSenha === senhaAtual) return res.status(400).json({ error: 'A nova senha deve ser diferente da atual.' });
            campos.push('senha = ?');
            params.push(await bcrypt.hash(novaSenha, 10));
        }

        if (foto_perfil !== undefined) {
            const foto = String(foto_perfil);
            if (foto.length > 15 * 1024 * 1024) return res.status(413).json({ error: 'A foto é muito grande. Escolha uma imagem menor.' });
            if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(foto)) {
                return res.status(400).json({ error: 'Formato de foto inválido.' });
            }
            campos.push('foto_perfil = ?');
            params.push(foto);
            usuarioAtualizado.foto_perfil = foto;
        }

        if (!campos.length) return res.status(400).json({ error: 'Nenhuma alteração informada.' });

        await conexao.execute(
            `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = ?`,
            [...params, idUsuario]
        );
        res.json({ mensagem: 'Perfil atualizado com sucesso!', usuario: usuarioAtualizado });
    } catch (error) {
        console.error('[PUT /perfil]', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
});

app.get('/servicos', async (req, res) => {
    try {
        const [resultado] = await conexao.query(
            'SELECT * FROM servicos ORDER BY id_servicos DESC'
        );
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar serviços" });
    }
});


app.get('/servicos/resgate', async (req, res) => {
    try {
        const [resultado] = await conexao.query(
            'SELECT * FROM servicos WHERE status = 1 AND pontos_resgate IS NOT NULL AND pontos_resgate > 0 ORDER BY pontos_resgate ASC'
        );
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar serviços de resgate" });
    }
});


app.get('/servicos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await conexao.query(
            'SELECT * FROM servicos WHERE id_servicos = ?',
            [id]
        );
        if (resultado.length === 0) {
            return res.status(404).json({ error: "Serviço não encontrado" });
        }
        res.json(resultado[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar serviço" });
    }
});


app.post('/servicos', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { nome, preco, duracao, pontos, status, pontos_resgate } = req.body;

        if (!nome || !preco || !duracao) {
            return res.status(400).json({ error: "Nome, preço e duração são obrigatórios" });
        }

        const [resultado] = await conexao.execute(
            'INSERT INTO servicos (nome, preco, duracao, pontos, status, pontos_resgate) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, preco, duracao, pontos || 0, status !== undefined ? status : 1, pontos_resgate || null]
        );

        res.json({
            insertId: resultado.insertId,
            mensagem: "Serviço cadastrado com sucesso!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao cadastrar serviço" });
    }
});


app.put('/servicos/:id', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, preco, duracao, pontos, status, pontos_resgate } = req.body;

        const [resultado] = await conexao.execute(
            'UPDATE servicos SET nome = ?, preco = ?, duracao = ?, pontos = ?, status = ?, pontos_resgate = ? WHERE id_servicos = ?',
            [nome, preco, duracao, pontos || 0, status !== undefined ? status : 1, pontos_resgate || null, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Serviço não encontrado" });
        }

        res.json({ mensagem: "Serviço atualizado com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao atualizar serviço" });
    }
});


app.delete('/servicos/:id', autenticar, autorizar('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const [emUso] = await conexao.execute(
            'SELECT COUNT(*) as total FROM agendavalor WHERE tipo_servico = ?',
            [id]
        );

        if (emUso[0].total > 0) {

            const [resultado] = await conexao.execute(
                'UPDATE servicos SET status = 0 WHERE id_servicos = ?',
                [id]
            );

            if (resultado.affectedRows === 0) {
                const [existe] = await conexao.execute('SELECT id_servicos FROM servicos WHERE id_servicos = ?', [id]);
                if (existe.length === 0) {
                    return res.status(404).json({ error: "Serviço não encontrado" });
                }
            }

            return res.json({ mensagem: "Este serviço já possui agendamentos vinculados e foi apenas desativado, pois não pode ser excluído permanentemente." });
        }


        const [resultado] = await conexao.execute(
            'DELETE FROM servicos WHERE id_servicos = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Serviço não encontrado" });
        }

        res.json({ mensagem: "Serviço excluído com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao excluir serviço" });
    }
});

app.get('/funcionarios', async (req, res) => {
    try {
        const [resultado] = await conexao.query(
            'SELECT * FROM funcionario ORDER BY id_funcionario ASC'
        );
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar funcionários" });
    }
});


app.get('/funcionarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await conexao.execute(
            'SELECT * FROM funcionario WHERE id_funcionario = ?',
            [id]
        );
        if (resultado.length === 0) {
            return res.status(404).json({ error: "Funcionário não encontrado" });
        }
        res.json(resultado[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar funcionário" });
    }
});


// Horários disponíveis para um funcionário em uma data.
// Retorna { horarios: ["09:00", "09:30", ...] }, formato consumido pelo mobile.
app.get('/funcionarios/:id/horarios', async (req, res) => {
    try {
        const idFuncionario = Number(req.params.id);
        const data = String(req.query.data || '');

        if (!Number.isInteger(idFuncionario) || idFuncionario <= 0) {
            return res.status(400).json({ error: 'ID de funcionário inválido.' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return res.status(400).json({ error: 'Informe a data no formato YYYY-MM-DD.' });
        }
        const [ano, mes, dia] = data.split('-').map(Number);
        const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
        if (dataUTC.getUTCFullYear() !== ano || dataUTC.getUTCMonth() !== mes - 1 || dataUTC.getUTCDate() !== dia) {
            return res.status(400).json({ error: 'Data inválida.' });
        }

        const [funcionarios] = await conexao.execute(
            'SELECT id_funcionario, status FROM funcionario WHERE id_funcionario = ?',
            [idFuncionario]
        );
        if (!funcionarios.length || Number(funcionarios[0].status) !== 1) {
            return res.status(404).json({ error: 'Funcionário não encontrado ou inativo.' });
        }

        // Quando a tela já tem serviços selecionados, considera a duração total deles.
        // Sem seleção ainda, usa 30 minutos para poder mostrar opções preliminares.
        let duracaoNecessaria = 30;
        const servicosParam = String(req.query.servicos || '').trim();
        if (servicosParam) {
            const idsServicos = [...new Set(servicosParam.split(',').map(Number))];
            if (idsServicos.some(id => !Number.isInteger(id) || id <= 0)) {
                return res.status(400).json({ error: 'Lista de serviços inválida.' });
            }
            const placeholders = idsServicos.map(() => '?').join(',');
            const [servicos] = await conexao.execute(
                `SELECT id_servicos, duracao FROM servicos WHERE status = 1 AND id_servicos IN (${placeholders})`,
                idsServicos
            );
            if (servicos.length !== idsServicos.length) {
                return res.status(400).json({ error: 'Um ou mais serviços não existem ou estão inativos.' });
            }
            duracaoNecessaria = servicos.reduce((total, servico) => total + Number(servico.duracao), 0);
        }

        const diaSemana = dataUTC.getUTCDay(); // 0=domingo ... 6=sábado
        const [jornadas] = await conexao.execute(
            `SELECT TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
                    TIME_FORMAT(hora_fim, '%H:%i') AS hora_fim
             FROM horarios_funcionario
             WHERE id_funcionario = ? AND dia_semana = ?
             ORDER BY hora_inicio`,
            [idFuncionario, diaSemana]
        );
        if (!jornadas.length) return res.json({ horarios: [] });

        const [agendamentos] = await conexao.execute(
            `SELECT TIME_FORMAT(a.data, '%H:%i') AS hora_inicio,
                    COALESCE(SUM(s.duracao), 30) AS duracao
             FROM agendamentos a
             LEFT JOIN agendavalor av ON av.id_agendamento = a.id
             LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
             WHERE a.id_funcionario = ?
               AND DATE(a.data) = ?
               AND a.status <> 'cancelado'
             GROUP BY a.id, a.data`,
            [idFuncionario, data]
        );

        const minutos = (hora) => {
            const partes = String(hora).slice(0, 5).split(':').map(Number);
            return partes[0] * 60 + partes[1];
        };
        const formatarHora = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
        const ocupados = agendamentos.map(ag => {
            const inicio = minutos(ag.hora_inicio);
            return { inicio, fim: inicio + Math.max(30, Number(ag.duracao) || 30) };
        });

        const hoje = new Date();
        const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
        const horariosLivres = new Set();

        for (const jornada of jornadas) {
            const inicioJornada = minutos(jornada.hora_inicio);
            const fimJornada = minutos(jornada.hora_fim);
            for (let inicio = inicioJornada; inicio + duracaoNecessaria <= fimJornada; inicio += 30) {
                if (data === hojeISO && inicio <= minutosAgora) continue;
                const fim = inicio + duracaoNecessaria;
                const conflita = ocupados.some(ocupado => inicio < ocupado.fim && fim > ocupado.inicio);
                if (!conflita) horariosLivres.add(formatarHora(inicio));
            }
        }

        res.json({ horarios: [...horariosLivres].sort() });
    } catch (error) {
        console.error('[GET /funcionarios/:id/horarios]', error);
        res.status(500).json({ error: 'Erro ao buscar horários do funcionário.' });
    }
});

app.post('/funcionarios', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { nome, funcao } = req.body;

        if (!nome || !funcao) {
            return res.status(400).json({ error: "Nome e função são obrigatórios" });
        }

        const [resultado] = await conexao.execute(
            'INSERT INTO funcionario (nome, funcao, status) VALUES (?, ?, 1)',
            [nome, funcao]
        );

        res.json({
            insertId: resultado.insertId,
            mensagem: "Funcionário cadastrado com sucesso!"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao cadastrar funcionário" });
    }
});

app.put('/funcionarios/:id', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, funcao, status } = req.body;

        if (!nome || !funcao) {
            return res.status(400).json({ error: "Nome e função são obrigatórios" });
        }

        const [resultado] = await conexao.execute(
            'UPDATE funcionario SET nome = ?, funcao = ?, status = ? WHERE id_funcionario = ?',
            [nome, funcao, status !== undefined ? status : 1, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Funcionário não encontrado" });
        }

        res.json({ mensagem: "Funcionário atualizado com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao atualizar funcionário" });
    }
});

app.delete('/funcionarios/:id', autenticar, autorizar('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const [agendamentos] = await conexao.execute(
            'SELECT id FROM agendamentos WHERE id_funcionario = ? LIMIT 1',
            [id]
        );

        if (agendamentos.length > 0) {
            const [resultado] = await conexao.execute(
                'UPDATE funcionario SET status = 0 WHERE id_funcionario = ?',
                [id]
            );

            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: "Funcionário não encontrado" });
            }

            return res.json({ mensagem: "Este funcionário já possui agendamentos vinculados e foi apenas desativado, pois não pode ser excluído permanentemente." });
        }

        const [resultado] = await conexao.execute(
            'DELETE FROM funcionario WHERE id_funcionario = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Funcionário não encontrado" });
        }

        res.json({ mensagem: "Funcionário excluído com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao excluir funcionário" });
    }
});


app.get('/agendamentos', autenticar, async (req, res) => {
    try {
        const perfil = req.usuario.perfil;
        if (!['admin', 'atendente', 'cliente'].includes(perfil)) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        let sql = `
            SELECT
                a.id,
                a.id_usuario,
                a.id_funcionario,
                a.data,
                a.status,
                a.feedback,
                a.forma_pagamento,
                u.nome_completo AS cliente_nome,
                f.nome AS funcionario_nome
            FROM agendamentos a
            LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
            LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario`;
        const params = [];
        if (perfil === 'cliente') {
            sql += ' WHERE a.id_usuario = ?';
            params.push(req.usuario.id_usuario);
        }
        sql += ' ORDER BY a.data DESC';
        const [agendamentos] = await conexao.execute(sql, params);

        for (const ag of agendamentos) {
            const [servicos] = await conexao.execute(`
                SELECT av.tipo_servico, av.valor, s.nome
                FROM agendavalor av
                LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
                WHERE av.id_agendamento = ?
            `, [ag.id]);
            ag.servicos = servicos;
            ag.valor_total = servicos.reduce((sum, s) => sum + Number(s.valor || 0), 0);
        }

        res.json(agendamentos);
    } catch (error) {
        console.error('[GET /agendamentos]', error);
        res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
    }
});

app.get('/agendamentos/:id', autenticar, async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await conexao.execute(`
            SELECT
                a.*,
                u.nome_completo  AS cliente_nome,
                f.nome           AS funcionario_nome
            FROM agendamentos a
            LEFT JOIN usuarios   u ON u.id_usuario     = a.id_usuario
            LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario
            WHERE a.id = ?
        `, [id]);

        if (resultado.length === 0) {
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        const ag = resultado[0];
        if (req.usuario.perfil === 'cliente' && Number(req.usuario.id_usuario) !== Number(ag.id_usuario)) {
            return res.status(403).json({ error: 'Você só pode consultar seus próprios agendamentos.' });
        }
        const [servicos] = await conexao.execute(`
            SELECT av.tipo_servico, av.valor, s.nome
            FROM agendavalor av
            LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
            WHERE av.id_agendamento = ?
        `, [id]);
        ag.servicos = servicos;
        ag.valor_total = servicos.reduce((sum, s) => sum + parseFloat(s.valor), 0);

        res.json(ag);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar agendamento" });
    }
});


app.get('/agendavalor/:id_agendamento', autenticar, async (req, res) => {
    try {
        const { id_agendamento } = req.params;
        const [agendamento] = await conexao.execute(
            'SELECT id_usuario FROM agendamentos WHERE id = ?', [id_agendamento]
        );
        if (!agendamento.length) return res.status(404).json({ error: 'Agendamento não encontrado.' });
        if (req.usuario.perfil === 'cliente' && Number(req.usuario.id_usuario) !== Number(agendamento[0].id_usuario)) {
            return res.status(403).json({ error: 'Você só pode consultar seus próprios agendamentos.' });
        }
        const [resultado] = await conexao.execute(`
            SELECT av.tipo_servico, av.valor, s.nome
            FROM agendavalor av
            LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
            WHERE av.id_agendamento = ?
        `, [id_agendamento]);
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar serviços do agendamento" });
    }
});

app.post('/agendamentos', autenticar, async (req, res) => {
    const db = await conexao.getConnection();
    try {
        const { id_usuario, id_funcionario, servicos, data, status, feedback, forma_pagamento } = req.body;
        if (!id_usuario || !id_funcionario || !Array.isArray(servicos) || !servicos.length || !data) {
            return res.status(400).json({ error: 'id_usuario, id_funcionario, servicos e data são obrigatórios.' });
        }
        if (req.usuario.perfil === 'cliente' && Number(req.usuario.id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({ error: 'Você só pode criar agendamentos para sua própria conta.' });
        }
        if (new Date(data) < new Date()) return res.status(400).json({ error: 'Não é possível agendar em uma data/horário que já passou.' });
        if (status && !['agendado', 'confirmado'].includes(status)) {
            return res.status(400).json({ error: 'O status inicial deve ser agendado ou confirmado. Use PATCH para concluir.' });
        }
        const servicosBanco = await obterServicosDoBanco(servicos, db);
        const { valor_total } = await validarConflitoHorario(id_funcionario, data, servicosBanco, null, db);
        await db.beginTransaction();
        const [resultado] = await db.execute(
            `INSERT INTO agendamentos (id_usuario, id_funcionario, data, status, feedback, forma_pagamento)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_usuario, id_funcionario, data, status || 'agendado', feedback || null, forma_pagamento || null]
        );
        for (const servico of servicosBanco) {
            await db.execute(
                'INSERT INTO agendavalor (tipo_servico, valor, id_agendamento) VALUES (?, ?, ?)',
                [servico.id_servicos, servico.preco, resultado.insertId]
            );
        }
        await db.commit();
        res.status(201).json({ insertId: resultado.insertId, valor_total, mensagem: `Agendamento criado! Total: R$ ${valor_total.toFixed(2)}` });
    } catch (error) {
        try { await db.rollback(); } catch {}
        const clientError = /serviço|servicos|horário|horario|data\/hora|duração|duracao|status inicial|ID de serviço/i.test(error.message);
        res.status(clientError ? 400 : 500).json({ error: clientError ? error.message : 'Erro ao criar agendamento' });
        if (!clientError) console.error(error);
    } finally { db.release(); }
});


app.put('/agendamentos/:id', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    const db = await conexao.getConnection();
    try {
        const { id } = req.params;
        const { id_usuario, id_funcionario, servicos, data, status, feedback, forma_pagamento } = req.body;
        if (!id_usuario || !id_funcionario || !Array.isArray(servicos) || !servicos.length || !data) {
            return res.status(400).json({ error: 'id_usuario, id_funcionario, servicos e data são obrigatórios.' });
        }
        if (status === 'concluido' || status === 'cancelado') {
            return res.status(400).json({ error: 'Use PATCH /agendamentos/:id/status para alterar o status.' });
        }
        const [atual] = await db.execute('SELECT id FROM agendamentos WHERE id = ?', [id]);
        if (!atual.length) return res.status(404).json({ error: 'Agendamento não encontrado.' });
        const servicosBanco = await obterServicosDoBanco(servicos, db);
        const { valor_total } = await validarConflitoHorario(id_funcionario, data, servicosBanco, id, db);
        await db.beginTransaction();
        await db.execute(
            `UPDATE agendamentos SET id_usuario = ?, id_funcionario = ?, data = ?, status = ?, feedback = ?, forma_pagamento = ? WHERE id = ?`,
            [id_usuario, id_funcionario, data, status || 'agendado', feedback || null, forma_pagamento || null, id]
        );
        await db.execute('DELETE FROM agendavalor WHERE id_agendamento = ?', [id]);
        for (const servico of servicosBanco) {
            await db.execute('INSERT INTO agendavalor (tipo_servico, valor, id_agendamento) VALUES (?, ?, ?)', [servico.id_servicos, servico.preco, id]);
        }
        await db.commit();
        res.json({ mensagem: 'Agendamento atualizado com sucesso!', valor_total });
    } catch (error) {
        try { await db.rollback(); } catch {}
        const clientError = /serviço|servicos|horário|horario|data\/hora|duração|duracao|ID de serviço/i.test(error.message);
        res.status(clientError ? 400 : 500).json({ error: clientError ? error.message : 'Erro ao atualizar agendamento' });
        if (!clientError) console.error(error);
    } finally { db.release(); }
});


app.delete('/agendamentos/:id', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { id } = req.params;


        await conexao.execute('DELETE FROM agendavalor WHERE id_agendamento = ?', [id]);

        const [resultado] = await conexao.execute(
            'DELETE FROM agendamentos WHERE id = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        res.json({ mensagem: "Agendamento excluído com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao excluir agendamento" });
    }
});


app.get('/agendamentos/funcionario/:id', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await conexao.execute(`
            SELECT a.*, u.nome_completo AS cliente_nome, s.nome AS servico_nome
            FROM agendamentos a
            LEFT JOIN usuarios  u ON u.id_usuario  = a.id_usuario
            LEFT JOIN agendavalor av ON av.id_agendamento = a.id\n            LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
            WHERE a.id_funcionario = ?
            ORDER BY a.data DESC
        `, [id]);
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar agendamentos do funcionário" });
    }
});


app.get('/agendamentos/usuario/:id', autenticar, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.usuario.perfil === 'cliente' && Number(req.usuario.id_usuario) !== Number(id)) {
            return res.status(403).json({ error: 'Você só pode consultar seus próprios agendamentos.' });
        }
        if (!['admin', 'atendente', 'cliente'].includes(req.usuario.perfil)) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const [resultado] = await conexao.execute(`
            SELECT a.*, s.nome AS servico_nome, f.nome AS funcionario_nome
            FROM agendamentos a
            LEFT JOIN agendavalor av ON av.id_agendamento = a.id\n            LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
            LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario
            WHERE a.id_usuario = ?
            ORDER BY a.data DESC
        `, [id]);
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar agendamentos do usuário" });
    }
});


const FLUXO_STATUS = {
    agendado: ['confirmado', 'cancelado'],
    confirmado: ['concluido', 'cancelado'],
    concluido: [],
    cancelado: []
};
app.patch('/agendamentos/:id/status', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    const db = await conexao.getConnection();
    try {
        const { id } = req.params;
        const { status } = req.body;
        const fluxo = { agendado: ['confirmado', 'cancelado'], confirmado: ['concluido', 'cancelado'], concluido: [], cancelado: [] };
        if (!Object.prototype.hasOwnProperty.call(fluxo, status)) {
            return res.status(400).json({ error: 'Status inválido.' });
        }
        await db.beginTransaction();
        const [rows] = await db.execute(
            'SELECT id, id_usuario, status, pontos_creditados FROM agendamentos WHERE id = ? FOR UPDATE', [id]
        );
        if (!rows.length) {
            await db.rollback();
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }
        const ag = rows[0];
        if (!fluxo[ag.status]?.includes(status)) {
            await db.rollback();
            return res.status(400).json({ error: `Não é possível alterar de "${ag.status}" para "${status}".` });
        }
        await db.execute('UPDATE agendamentos SET status = ? WHERE id = ?', [status, id]);
        let pontosCreditados = 0;
        if (status === 'concluido' && Number(ag.pontos_creditados) !== 1) {
            const [servicos] = await db.execute(
                `SELECT COALESCE(SUM(s.pontos), 0) AS total
                 FROM agendavalor av JOIN servicos s ON s.id_servicos = av.tipo_servico
                 WHERE av.id_agendamento = ?`, [id]
            );
            pontosCreditados = Number(servicos[0]?.total || 0);
            if (pontosCreditados > 0) {
                await db.execute(
                    `INSERT INTO fidelidade (id_usuario, pontos) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE pontos = pontos + VALUES(pontos)`,
                    [ag.id_usuario, pontosCreditados]
                );
            }
            await db.execute('UPDATE agendamentos SET pontos_creditados = 1 WHERE id = ?', [id]);
        }
        await db.commit();
        res.json({ mensagem: `Status atualizado para "${status}"`, pontos_creditados: pontosCreditados });
    } catch (error) {
        try { await db.rollback(); } catch {}
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar status do agendamento.' });
    } finally { db.release(); }
});


app.get('/fidelidade/ranking', async (req, res) => {
    try {
        const [resultado] = await conexao.query(`
            SELECT u.id_usuario, u.nome_completo, u.email,
                   COALESCE(f.pontos, 0) AS pontos
            FROM usuarios u
            LEFT JOIN fidelidade f ON f.id_usuario = u.id_usuario
            ORDER BY pontos DESC
            LIMIT 10
        `);
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar ranking de fidelidade" });
    }
});


app.get('/fidelidade/resgates', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const [rows] = await conexao.execute(`
            SELECT
                hr.id,
                u.nome_completo AS nome_cliente,
                s.nome AS nome_servico,
                hr.pontos_gastos,
                hr.data_resgate
            FROM historico_resgates hr
            JOIN usuarios u ON u.id_usuario = hr.id_usuario
            JOIN servicos s ON s.id_servicos = hr.id_servico
            ORDER BY hr.data_resgate DESC
        `);
        res.json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar historico de resgates" });
    }
});


app.get('/fidelidade/:id_usuario', autenticar, async (req, res) => {
    try {
        const { id_usuario } = req.params;
        if (req.usuario.perfil === 'cliente' && Number(req.usuario.id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({ error: 'Você só pode consultar seus próprios pontos.' });
        }
        if (!['admin', 'atendente', 'cliente'].includes(req.usuario.perfil)) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const [fidRows] = await conexao.execute(
            'SELECT pontos FROM fidelidade WHERE id_usuario = ?',
            [id_usuario]
        );
        const pontos = fidRows.length > 0 ? parseFloat(fidRows[0].pontos) : 0;


        const [agendamentosConc] = await conexao.execute(`
            SELECT a.id, a.data, a.status,
                   GROUP_CONCAT(s.nome ORDER BY s.nome SEPARATOR ', ') AS servicos_nomes,
                   SUM(s.pontos) AS pontos_ganhos
            FROM agendamentos a
            JOIN agendavalor av ON av.id_agendamento = a.id
            JOIN servicos    s  ON s.id_servicos = av.tipo_servico
            WHERE a.id_usuario = ? AND a.status = 'concluido'
            GROUP BY a.id, a.data, a.status
            ORDER BY a.data DESC
            LIMIT 20
        `, [id_usuario]);

        const total_ganho = agendamentosConc.reduce((sum, a) => sum + parseFloat(a.pontos_ganhos || 0), 0);
        const total_resgatado = Math.max(0, total_ganho - pontos);

        const historico = agendamentosConc.map(a => ({
            tipo: 'ganho',
            pontos: parseFloat(a.pontos_ganhos || 0),
            descricao: `Servico: ${a.servicos_nomes || '-'}`,
            data: a.data
        }));

        res.json({ id_usuario, pontos, total_ganho, total_resgatado, historico });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar pontos do cliente" });
    }
});


app.post('/fidelidade/adicionar', autenticar, autorizar('admin', 'atendente'), async (req, res) => {
    try {
        const { id_usuario, pontos } = req.body;
        if (!id_usuario || pontos == null) {
            return res.status(400).json({ error: "id_usuario e pontos sao obrigatorios" });
        }

        const [exists] = await conexao.execute(
            'SELECT id_usuario FROM fidelidade WHERE id_usuario = ?',
            [id_usuario]
        );

        if (exists.length > 0) {
            await conexao.execute(
                'UPDATE fidelidade SET pontos = pontos + ? WHERE id_usuario = ?',
                [pontos, id_usuario]
            );
        } else {
            await conexao.execute(
                'INSERT INTO fidelidade (id_usuario, pontos) VALUES (?, ?)',
                [id_usuario, pontos]
            );
        }

        const [updated] = await conexao.execute(
            'SELECT pontos FROM fidelidade WHERE id_usuario = ?',
            [id_usuario]
        );
        res.json({ mensagem: `${pontos} pontos adicionados com sucesso!`, saldo: parseFloat(updated[0].pontos) });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao adicionar pontos" });
    }
});


app.post('/fidelidade/resgatar', autenticar, async (req, res) => {
    try {
        const { id_usuario, id_servico } = req.body;
        if (req.usuario.perfil === 'cliente' && Number(req.usuario.id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({ error: 'Você só pode resgatar pontos da sua própria conta.' });
        }
        if (!id_usuario || !id_servico) {
            return res.status(400).json({ error: "id_usuario e id_servico sao obrigatorios" });
        }

        const [servicos] = await conexao.execute(
            'SELECT * FROM servicos WHERE id_servicos = ? AND status = 1 AND pontos_resgate IS NOT NULL AND pontos_resgate > 0',
            [id_servico]
        );

        if (servicos.length === 0) {
            return res.status(404).json({ error: "Servico nao encontrado ou nao disponivel para resgate" });
        }

        const servico = servicos[0];
        const custoResgate = parseFloat(servico.pontos_resgate);

        const [fidRows] = await conexao.execute(
            'SELECT pontos FROM fidelidade WHERE id_usuario = ?',
            [id_usuario]
        );
        const saldoAtual = fidRows.length > 0 ? parseFloat(fidRows[0].pontos) : 0;

        if (saldoAtual < custoResgate) {
            return res.status(400).json({
                error: `Saldo insuficiente. Voce tem ${saldoAtual.toFixed(0)} pts e precisa de ${custoResgate.toFixed(0)} pts.`
            });
        }

        await conexao.execute(
            'UPDATE fidelidade SET pontos = pontos - ? WHERE id_usuario = ?',
            [custoResgate, id_usuario]
        );

        await conexao.execute(
            'INSERT INTO historico_resgates (id_usuario, id_servico, pontos_gastos) VALUES (?, ?, ?)',
            [id_usuario, id_servico, custoResgate]
        );

        const novoSaldo = saldoAtual - custoResgate;
        res.json({
            mensagem: `Resgate realizado! Servico: ${servico.nome}. Pontos usados: ${custoResgate.toFixed(0)}. Saldo restante: ${novoSaldo.toFixed(0)} pts.`,
            pontos_usados: custoResgate,
            saldo_restante: novoSaldo
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao resgatar servico" });
    }
});


app.post('/fidelidade/creditar-agendamento', (req, res) => {
    return res.status(410).json({
        error: 'Rota desativada. Os pontos são creditados automaticamente em PATCH /agendamentos/:id/status.'
    });
});
