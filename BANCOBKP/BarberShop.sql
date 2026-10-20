-- --------------------------------------------------------
-- Servidor:                     127.0.0.1
-- Versão do servidor:           12.3.3-MariaDB - MariaDB Server
-- OS do Servidor:               Win64
-- HeidiSQL Versão:              12.20.0.7320
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Copiando estrutura do banco de dados para barbearia_db
DROP DATABASE IF EXISTS `barbearia_db`;
CREATE DATABASE IF NOT EXISTS `barbearia_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `barbearia_db`;

-- Copiando estrutura para tabela barbearia_db.agendamentos
DROP TABLE IF EXISTS `agendamentos`;
CREATE TABLE IF NOT EXISTS `agendamentos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_funcionario` int(11) NOT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(15) NOT NULL,
  `feedback` varchar(300) DEFAULT NULL,
  `forma_pagamento` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_agendamento_usuario` (`id_usuario`) USING BTREE,
  KEY `fk_agendamento_funcionario` (`id_funcionario`) USING BTREE,
  CONSTRAINT `fk_agendamento_funcionario` FOREIGN KEY (`id_funcionario`) REFERENCES `funcionario` (`id_funcionario`),
  CONSTRAINT `fk_agendamento_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.agendamentos: ~1 rows (aproximadamente)
INSERT INTO `agendamentos` (`id`, `id_usuario`, `id_funcionario`, `data`, `status`, `feedback`, `forma_pagamento`) VALUES
	(69, 1, 2, '2026-08-29 18:00:00', 'agendado', NULL, 'Pix');

-- Copiando estrutura para tabela barbearia_db.agendavalor
DROP TABLE IF EXISTS `agendavalor`;
CREATE TABLE IF NOT EXISTS `agendavalor` (
  `tipo_servico` int(11) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `id_agendamento` int(11) NOT NULL,
  KEY `FK_agendavalor_servicos` (`tipo_servico`),
  KEY `FK_agendavalor_agendamentos` (`id_agendamento`),
  CONSTRAINT `FK_agendavalor_agendamentos` FOREIGN KEY (`id_agendamento`) REFERENCES `agendamentos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_agendavalor_servicos` FOREIGN KEY (`tipo_servico`) REFERENCES `servicos` (`id_servicos`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.agendavalor: ~5 rows (aproximadamente)
INSERT INTO `agendavalor` (`tipo_servico`, `valor`, `id_agendamento`) VALUES
	(5, 10.00, 69),
	(4, 40.00, 69),
	(3, 150.00, 69),
	(2, 25.00, 69),
	(1, 30.00, 69);

-- Copiando estrutura para tabela barbearia_db.fidelidade
DROP TABLE IF EXISTS `fidelidade`;
CREATE TABLE IF NOT EXISTS `fidelidade` (
  `id_usuario` int(11) NOT NULL,
  `pontos` decimal(10,2) NOT NULL DEFAULT 0.00,
  KEY `fk_fidelidade_usuario` (`id_usuario`) USING BTREE,
  CONSTRAINT `fk_fidelidade_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.fidelidade: ~0 rows (aproximadamente)

-- Copiando estrutura para tabela barbearia_db.funcionario
DROP TABLE IF EXISTS `funcionario`;
CREATE TABLE IF NOT EXISTS `funcionario` (
  `id_funcionario` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `funcao` varchar(100) NOT NULL,
  PRIMARY KEY (`id_funcionario`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.funcionario: ~3 rows (aproximadamente)
INSERT INTO `funcionario` (`id_funcionario`, `nome`, `funcao`) VALUES
	(1, 'João Silva', 'Barbeiro'),
	(2, 'Gustavo Lima', 'Estilista'),
	(3, 'Enzo Serra', 'Barbeiro');

-- Copiando estrutura para tabela barbearia_db.historico_resgates
DROP TABLE IF EXISTS `historico_resgates`;
CREATE TABLE IF NOT EXISTS `historico_resgates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_servico` int(11) NOT NULL,
  `pontos_gastos` decimal(10,2) NOT NULL,
  `data_resgate` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_resgate_usuario` (`id_usuario`),
  KEY `fk_resgate_servico` (`id_servico`),
  CONSTRAINT `fk_resgate_servico` FOREIGN KEY (`id_servico`) REFERENCES `servicos` (`id_servicos`) ON DELETE CASCADE,
  CONSTRAINT `fk_resgate_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.historico_resgates: ~0 rows (aproximadamente)

-- Copiando estrutura para tabela barbearia_db.horarios_funcionario
DROP TABLE IF EXISTS `horarios_funcionario`;
CREATE TABLE IF NOT EXISTS `horarios_funcionario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_funcionario` int(11) NOT NULL,
  `dia_semana` tinyint(1) NOT NULL COMMENT '0=domingo, 1=segunda ... 6=sabado',
  `hora_inicio` time NOT NULL,
  `hora_fim` time NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_horario_funcionario` (`id_funcionario`) USING BTREE,
  CONSTRAINT `fk_horario_funcionario` FOREIGN KEY (`id_funcionario`) REFERENCES `funcionario` (`id_funcionario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.horarios_funcionario: ~14 rows (aproximadamente)
INSERT INTO `horarios_funcionario` (`id`, `id_funcionario`, `dia_semana`, `hora_inicio`, `hora_fim`) VALUES
	(22, 1, 1, '08:00:00', '19:00:00'),
	(23, 1, 2, '08:00:00', '19:00:00'),
	(24, 1, 3, '08:00:00', '19:00:00'),
	(25, 1, 4, '08:00:00', '19:00:00'),
	(26, 1, 5, '08:00:00', '19:00:00'),
	(27, 2, 6, '08:00:00', '20:00:00'),
	(28, 2, 0, '08:00:00', '20:00:00'),
	(29, 3, 1, '11:00:00', '17:00:00'),
	(30, 3, 2, '11:00:00', '17:00:00'),
	(31, 3, 3, '11:00:00', '17:00:00'),
	(32, 3, 4, '11:00:00', '17:00:00'),
	(33, 3, 5, '11:00:00', '17:00:00'),
	(34, 3, 6, '11:00:00', '17:00:00'),
	(35, 3, 0, '11:00:00', '17:00:00');

-- Copiando estrutura para tabela barbearia_db.reset_tokens
DROP TABLE IF EXISTS `reset_tokens`;
CREATE TABLE IF NOT EXISTS `reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expira_em` datetime NOT NULL,
  `usado` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `reset_tokens_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.reset_tokens: ~0 rows (aproximadamente)

-- Copiando estrutura para tabela barbearia_db.servicos
DROP TABLE IF EXISTS `servicos`;
CREATE TABLE IF NOT EXISTS `servicos` (
  `id_servicos` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  `duracao` int(11) NOT NULL,
  `pontos` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `pontos_resgate` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_servicos`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.servicos: ~5 rows (aproximadamente)
INSERT INTO `servicos` (`id_servicos`, `nome`, `preco`, `duracao`, `pontos`, `status`, `pontos_resgate`) VALUES
	(1, 'Corte de Cabelo', 30.00, 30, 10, 1, 100),
	(2, 'Barba', 25.00, 25, 8, 1, 80),
	(3, 'Platinado', 150.00, 120, 60, 1, 500),
	(4, 'Hidratação Capilar', 40.00, 40, 15, 1, 150),
	(5, 'Sombrancelha', 10.00, 10, 5, 1, 50);

-- Copiando estrutura para tabela barbearia_db.usuarios
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nome_completo` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(256) NOT NULL,
  `cep` varchar(10) NOT NULL,
  `primeiro_acesso` tinyint(1) DEFAULT 1,
  `perfil` enum('admin','atendente','cliente') NOT NULL DEFAULT 'cliente',
  PRIMARY KEY (`id_usuario`) USING BTREE,
  UNIQUE KEY `Email` (`email`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.usuarios: ~1 rows (aproximadamente)
INSERT INTO `usuarios` (`id_usuario`, `nome_completo`, `email`, `senha`, `cep`, `primeiro_acesso`, `perfil`) VALUES
	(1, 'Gustavo', 'gustavo@gmail.com', '$2b$10$Wy85jPNPFrVga/RagIb2Te/NSbuHxbnIHMeQ6nKaor6mZ1Rdy4Mwa', '12345678', 0, 'admin');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
