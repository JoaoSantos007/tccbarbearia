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
const api_chave = "barbershop_secret_key_2024"

app.listen(porta, () => {  
    console.log(`Servidor rodando em http://localhost:${porta}`)
    console.log(`Documentação Swagger: http://localhost:${porta}/api-docs`)
})

// ================= CADASTRAR USUÁRIO =================
// Requisito 3c: Senha em branco no primeiro cadastro
app.post('/cadastrar', async (req, res) => {
    try {
        const { nome_completo, cep, email, senha } = req.body;
       
        // Verificar se email já existe
        const [existe] = await conexao.execute(
            'SELECT email FROM usuarios WHERE email = ?',
            [email]
        );
       
        if (existe.length > 0) {
            return res.status(400).json({ error: "Email já cadastrado!" });
        }
       
        // Se senha for vazia ou null, cadastra sem senha (primeiro acesso)
        let senhaHash = null;
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

// ================= LOGIN =================
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
       
        // Requisito 3c: Verificar se é primeiro acesso (senha não cadastrada)
        if (usuario.primeiro_acesso === 1 || !usuario.senha) {
            return res.status(403).json({
                mensagem: "Primeiro acesso! Cadastre sua senha.",
                primeiro_acesso: true,
                usuario_id: usuario.id_usuario
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
                nome: usuario.nome_completo
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
                cep: usuario.cep
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensagem: "Erro ao fazer login!" });
    }
});

// ================= BUSCAR TODOS USUÁRIOS =================
app.get('/buscar', async (req, res) => {
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

// ================= ATUALIZAR USUÁRIO =================
// Requisito 3a: Edição de usuários (nome, email, senha)
app.put('/atualizar', async (req, res) => {
    try {
        const { id_usuario, nome_completo, cep, email, senha } = req.body;
       
        let query = 'UPDATE usuarios SET nome_completo = ?, cep = ?, email = ?';
        const params = [nome_completo, cep, email];
       
        // Se senha foi fornecida, atualiza também
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

// ================= DELETAR USUÁRIO =================
app.delete('/deletar', async (req, res) => {
    try {
        const { id_usuario } = req.body;
       
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

// ================= ESQUECI MINHA SENHA - SOLICITAR RECUPERAÇÃO =================
// Requisito 3b: Recuperação de senha
app.post('/esqueci-senha', async (req, res) => {
    const { email } = req.body;
   
    try {
        const [usuario] = await conexao.execute(
            'SELECT id_usuario, email, nome_completo FROM usuarios WHERE email = ?',
            [email]
        );
       
        if (usuario.length === 0) {
            return res.status(404).json({ mensagem: "Email não encontrado!" });
        }
       
        // Gerar token único para troca de senha
        const resetToken = jwt.sign(
            { id_usuario: usuario[0].id_usuario, email: usuario[0].email },
            api_chave,
            { expiresIn: "30min" }
        );
       
        // Remover tokens antigos deste usuário
        await conexao.execute(
            'DELETE FROM reset_tokens WHERE id_usuario = ?',
            [usuario[0].id_usuario]
        );
       
        // Salvar novo token no banco
        const expiraEm = new Date();
        expiraEm.setMinutes(expiraEm.getMinutes() + 30);
       
        await conexao.execute(
            'INSERT INTO reset_tokens (id_usuario, token, expira_em) VALUES (?, ?, ?)',
            [usuario[0].id_usuario, resetToken, expiraEm]
        );
       
        // Retornar token para demonstração (em produção enviaria por email)
        res.json({
            mensagem: "Link de recuperação gerado! (Em produção seria enviado por email)",
            token: resetToken,
            link_demo: `http://localhost:3000/resetar.html?token=${resetToken}`
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao processar solicitação" });
    }
});

// ================= RESETAR SENHA =================
// Requisito 3b: Trocar senha
app.post('/resetar-senha', async (req, res) => {
    const { token, nova_senha } = req.body;
   
    if (!nova_senha || nova_senha.trim() === '') {
        return res.status(400).json({ error: "Senha não pode estar vazia!" });
    }
   
    if (nova_senha.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres!" });
    }
   
    try {
        // Verificar se token existe e não foi usado
        const [tokenValido] = await conexao.execute(
            'SELECT * FROM reset_tokens WHERE token = ? AND usado = 0 AND expira_em > NOW()',
            [token]
        );
       
        if (tokenValido.length === 0) {
            return res.status(400).json({ error: "Token inválido ou expirado! Solicite nova recuperação." });
        }
       
        // Decodificar token
        const decoded = jwt.verify(token, api_chave);
       
        // Hash da nova senha
        const hash = await bcrypt.hash(nova_senha, 10);
       
        // Atualizar senha do usuário
        await conexao.execute(
            'UPDATE usuarios SET senha = ?, primeiro_acesso = 0 WHERE id_usuario = ?',
            [hash, decoded.id_usuario]
        );
       
        // Marcar token como usado
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

// ================= CADASTRAR SENHA NO PRIMEIRO ACESSO =================
app.post('/primeiro-acesso', async (req, res) => {
    const { id_usuario, nova_senha } = req.body;
   
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
// Buscar todos os serviços
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

// Buscar serviços disponíveis para resgate (pontos_resgate preenchido e ativo)
// ATENÇÃO: esta rota DEVE vir antes de /servicos/:id para não ser capturada como :id = "resgate"
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

// Buscar serviço por ID
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

// Cadastrar serviço
app.post('/servicos', async (req, res) => {
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

// Atualizar serviço
app.put('/servicos/:id', async (req, res) => {
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

// Deletar serviço (soft delete)
app.delete('/servicos/:id', async (req, res) => {
    try {
        const { id } = req.params;
       
        const [resultado] = await conexao.execute(
            'UPDATE servicos SET status = 0 WHERE id_servicos = ?',
            [id]
        );
       
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Serviço não encontrado" });
        }
       
        res.json({ mensagem: "Serviço deletado com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao deletar serviço" });
    }
});

// ================================================================
// NOVAS ROTAS — cole no final do seu index.js
// (antes do inicializar() ou de qualquer outro código final)
// ================================================================

// ===================== FUNCIONÁRIOS =====================

// GET todos os funcionários
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

// GET funcionário por ID
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

// POST cadastrar funcionário
app.post('/funcionarios', async (req, res) => {
    try {
        const { nome, funcao } = req.body;

        if (!nome || !funcao) {
            return res.status(400).json({ error: "Nome e função são obrigatórios" });
        }

        const [resultado] = await conexao.execute(
            'INSERT INTO funcionario (nome, funcao) VALUES (?, ?)',
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

// PUT atualizar funcionário
app.put('/funcionarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, funcao } = req.body;

        if (!nome || !funcao) {
            return res.status(400).json({ error: "Nome e função são obrigatórios" });
        }

        const [resultado] = await conexao.execute(
            'UPDATE funcionario SET nome = ?, funcao = ? WHERE id_funcionario = ?',
            [nome, funcao, id]
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

// DELETE funcionário
app.delete('/funcionarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se há agendamentos vinculados
        const [agendamentos] = await conexao.execute(
            'SELECT id FROM agendamentos WHERE id_funcionario = ? LIMIT 1',
            [id]
        );

        if (agendamentos.length > 0) {
            return res.status(400).json({
                error: "Não é possível excluir: funcionário possui agendamentos vinculados."
            });
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


// ===================== AGENDAMENTOS =====================
//
// A tabela agendavalor (já existente no banco) é usada para
// registrar múltiplos serviços por agendamento:
//   agendavalor(tipo_servico, valor, id_agendamento)
//
// Se a coluna id_servicos ainda existir em agendamentos,
// ela pode ser mantida ou removida. As novas rotas não a utilizam.
// Para remover (opcional):
//   ALTER TABLE agendamentos DROP FOREIGN KEY fk_agendamento_servico;
//   ALTER TABLE agendamentos DROP COLUMN id_servicos;
//   ALTER TABLE agendamentos DROP COLUMN agenda_valor;
//

// GET todos os agendamentos (com JOIN para trazer nomes e serviços via agendavalor)
app.get('/agendamentos', async (req, res) => {
    try {
        // Busca agendamentos com dados básicos
        const [agendamentos] = await conexao.query(`
            SELECT
                a.id,
                a.id_usuario,
                a.id_funcionario,
                a.data,
                a.status,
                a.feedback,
                a.forma_pagamento,
                u.nome_completo  AS cliente_nome,
                f.nome           AS funcionario_nome
            FROM agendamentos a
            LEFT JOIN usuarios    u ON u.id_usuario     = a.id_usuario
            LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario
            ORDER BY a.data DESC
        `);

        // Para cada agendamento, busca os serviços em agendavalor
        for (const ag of agendamentos) {
            const [servicos] = await conexao.execute(`
                SELECT av.tipo_servico, av.valor, s.nome
                FROM agendavalor av
                LEFT JOIN servicos s ON s.id_servicos = av.tipo_servico
                WHERE av.id_agendamento = ?
            `, [ag.id]);
            ag.servicos = servicos;
            ag.valor_total = servicos.reduce((sum, s) => sum + parseFloat(s.valor), 0);
        }

        res.json(agendamentos);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
});

// GET agendamento por ID
app.get('/agendamentos/:id', async (req, res) => {
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

// GET serviços de um agendamento (agendavalor)
app.get('/agendavalor/:id_agendamento', async (req, res) => {
    try {
        const { id_agendamento } = req.params;
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

// POST criar agendamento com múltiplos serviços
app.post('/agendamentos', async (req, res) => {
    try {
        const { id_usuario, id_funcionario, servicos, data, status, feedback, forma_pagamento } = req.body;

        if (!id_usuario || !id_funcionario || !servicos || !servicos.length || !data) {
            return res.status(400).json({
                error: "id_usuario, id_funcionario, servicos (array) e data são obrigatórios"
            });
        }

        const valor_total = servicos.reduce((sum, s) => sum + parseFloat(s.valor), 0);

        // Insere o agendamento (sem id_servicos — agora usa agendavalor)
        const [resultado] = await conexao.execute(
            `INSERT INTO agendamentos (id_usuario, id_funcionario, data, status, feedback, forma_pagamento)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_usuario, id_funcionario, data, status || 'agendado', feedback || null, forma_pagamento || null]
        );

        const id_agendamento = resultado.insertId;

        // Insere cada serviço em agendavalor
        for (const s of servicos) {
            await conexao.execute(
                'INSERT INTO agendavalor (tipo_servico, valor, id_agendamento) VALUES (?, ?, ?)',
                [s.tipo_servico, s.valor, id_agendamento]
            );
        }

        res.json({
            insertId: id_agendamento,
            valor_total,
            mensagem: `Agendamento criado! Total: R$ ${valor_total.toFixed(2)}`
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao criar agendamento" });
    }
});

// PUT atualizar agendamento com múltiplos serviços
app.put('/agendamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario, id_funcionario, servicos, data, status, feedback, forma_pagamento } = req.body;

        const [atual] = await conexao.execute(
            'SELECT id FROM agendamentos WHERE id = ?', [id]
        );
        if (atual.length === 0) {
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        await conexao.execute(
            `UPDATE agendamentos SET id_usuario = ?, id_funcionario = ?, data = ?, status = ?, feedback = ?, forma_pagamento = ? WHERE id = ?`,
            [id_usuario, id_funcionario, data, status, feedback || null, forma_pagamento || null, id]
        );

        // Atualiza serviços: apaga os antigos e reinsere
        if (servicos && servicos.length) {
            await conexao.execute('DELETE FROM agendavalor WHERE id_agendamento = ?', [id]);
            for (const s of servicos) {
                await conexao.execute(
                    'INSERT INTO agendavalor (tipo_servico, valor, id_agendamento) VALUES (?, ?, ?)',
                    [s.tipo_servico, s.valor, id]
                );
            }
            const valor_total = servicos.reduce((sum, s) => sum + parseFloat(s.valor), 0);
            return res.json({ mensagem: "Agendamento atualizado com sucesso!", valor_total });
        }

        res.json({ mensagem: "Agendamento atualizado com sucesso!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
});

// DELETE agendamento
app.delete('/agendamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Remove os serviços vinculados primeiro (FK agendavalor → agendamentos)
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

// GET agendamentos por funcionário
app.get('/agendamentos/funcionario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await conexao.execute(`
            SELECT a.*, u.nome_completo AS cliente_nome, s.nome AS servico_nome
            FROM agendamentos a
            LEFT JOIN usuarios  u ON u.id_usuario  = a.id_usuario
            LEFT JOIN servicos  s ON s.id_servicos = a.id_servicos
            WHERE a.id_funcionario = ?
            ORDER BY a.data DESC
        `, [id]);
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar agendamentos do funcionário" });
    }
});

// GET agendamentos por usuário/cliente
app.get('/agendamentos/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await conexao.execute(`
            SELECT a.*, s.nome AS servico_nome, f.nome AS funcionario_nome
            FROM agendamentos a
            LEFT JOIN servicos   s ON s.id_servicos    = a.id_servicos
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

// PATCH atualizar apenas o status de um agendamento
app.patch('/agendamentos/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const statusValidos = ['agendado', 'confirmado', 'concluido', 'cancelado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Use: ${statusValidos.join(', ')}` });
        }

        const [resultado] = await conexao.execute(
            'UPDATE agendamentos SET status = ? WHERE id = ?',
            [status, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        res.json({ mensagem: `Status atualizado para "${status}"` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao atualizar status" });
    }
});

// ===================== FIDELIDADE =====================

// GET ranking de pontos de todos os clientes
app.get('/fidelidade/ranking', async (req, res) => {
    try {
        const [resultado] = await conexao.query(`
            SELECT u.id_usuario, u.nome_completo, u.email,
                   COALESCE(f.pontos, 0) AS pontos
            FROM usuarios u
            LEFT JOIN fidelidade f ON f.id_usuario = u.id_usuario
            ORDER BY pontos DESC
        `);
        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar ranking de fidelidade" });
    }
});

// GET historico de resgates realizados — DEVE vir antes de /fidelidade/:id_usuario
app.get('/fidelidade/resgates', async (req, res) => {
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

// GET pontos de um cliente específico (saldo, historico, total ganho/resgatado)
app.get('/fidelidade/:id_usuario', async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const [fidRows] = await conexao.execute(
            'SELECT pontos FROM fidelidade WHERE id_usuario = ?',
            [id_usuario]
        );
        const pontos = fidRows.length > 0 ? parseFloat(fidRows[0].pontos) : 0;

        // Historico: agendamentos concluidos com pontos ganhos
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

// POST adicionar pontos manualmente a um cliente
app.post('/fidelidade/adicionar', async (req, res) => {
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

// GET historico de resgates realizados
// POST resgatar servico com pontos
app.post('/fidelidade/resgatar', async (req, res) => {
    try {
        const { id_usuario, id_servico } = req.body;
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

// POST creditar pontos automaticamente ao concluir agendamento
app.post('/fidelidade/creditar-agendamento', async (req, res) => {
    try {
        const { id_agendamento } = req.body;
        if (!id_agendamento) {
            return res.status(400).json({ error: "id_agendamento e obrigatorio" });
        }

        const [agRows] = await conexao.execute(
            'SELECT id, id_usuario, status FROM agendamentos WHERE id = ?',
            [id_agendamento]
        );
        if (agRows.length === 0) {
            return res.status(404).json({ error: "Agendamento nao encontrado" });
        }
        const ag = agRows[0];
        if (ag.status !== 'concluido') {
            return res.status(400).json({ error: "Pontos so sao creditados para agendamentos concluidos" });
        }

        const [servicos] = await conexao.execute(`
            SELECT s.pontos
            FROM agendavalor av
            JOIN servicos s ON s.id_servicos = av.tipo_servico
            WHERE av.id_agendamento = ?
        `, [id_agendamento]);

        const totalPontos = servicos.reduce((sum, s) => sum + parseInt(s.pontos || 0), 0);
        if (totalPontos === 0) {
            return res.json({ mensagem: "Nenhum ponto a creditar para este agendamento." });
        }

        const [exists] = await conexao.execute(
            'SELECT id_usuario FROM fidelidade WHERE id_usuario = ?',
            [ag.id_usuario]
        );
        if (exists.length > 0) {
            await conexao.execute(
                'UPDATE fidelidade SET pontos = pontos + ? WHERE id_usuario = ?',
                [totalPontos, ag.id_usuario]
            );
        } else {
            await conexao.execute(
                'INSERT INTO fidelidade (id_usuario, pontos) VALUES (?, ?)',
                [ag.id_usuario, totalPontos]
            );
        }

        res.json({ mensagem: `${totalPontos} pontos creditados com sucesso!`, pontos_creditados: totalPontos });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao creditar pontos" });
    }
});
