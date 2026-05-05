-- --------------------------------------------------------
-- Servidor:                     127.0.0.1
-- Versão do servidor:           10.4.32-MariaDB - mariadb.org binary distribution
-- OS do Servidor:               Win64
-- HeidiSQL Versão:              12.10.0.7000
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
  `id_servicos` int(11) NOT NULL,
  `agenda_valor` decimal(10,2) NOT NULL DEFAULT 0.00,
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(15) NOT NULL,
  `feedback` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_agendamento_usuario` (`id_usuario`) USING BTREE,
  KEY `fk_agendamento_funcionario` (`id_funcionario`) USING BTREE,
  KEY `fk_agendamento_servico` (`id_servicos`) USING BTREE,
  CONSTRAINT `fk_agendamento_funcionario` FOREIGN KEY (`id_funcionario`) REFERENCES `funcionario` (`id_funcionario`),
  CONSTRAINT `fk_agendamento_servico` FOREIGN KEY (`id_servicos`) REFERENCES `servicos` (`id_servicos`),
  CONSTRAINT `fk_agendamento_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.agendamentos: ~12 rows (aproximadamente)
DELETE FROM `agendamentos`;
INSERT INTO `agendamentos` (`id`, `id_usuario`, `id_funcionario`, `id_servicos`, `agenda_valor`, `data`, `status`, `feedback`) VALUES
	(24, 1, 1, 1, 35.00, '2026-05-05 12:00:00', 'agendado', NULL),
	(25, 2, 2, 3, 65.00, '2026-05-05 13:00:00', 'confirmado', NULL),
	(26, 3, 3, 6, 50.00, '2026-05-06 17:00:00', 'agendado', NULL),
	(27, 4, 1, 2, 40.00, '2026-05-07 14:00:00', 'agendado', NULL),
	(28, 5, 2, 4, 90.00, '2026-05-08 18:00:00', 'cancelado', NULL),
	(29, 1, 2, 3, 65.00, '2026-04-20 12:30:00', 'concluido', 'Ótimo atendimento, saí muito satisfeito!'),
	(30, 2, 1, 1, 35.00, '2026-04-18 13:00:00', 'concluido', 'Corte perfeito como sempre.'),
	(31, 3, 3, 5, 20.00, '2026-04-15 19:00:00', 'concluido', 'Rápido e bem feito.'),
	(32, 4, 2, 7, 20.00, '2026-04-10 14:30:00', 'concluido', NULL),
	(35, 6, 2, 1, 35.00, '2026-04-22 12:00:00', 'cancelado', NULL),
	(36, 1, 1, 8, 50.00, '2026-04-30 18:29:00', 'concluido', NULL),
	(38, 1, 5, 1, 35.00, '2026-04-30 20:45:00', 'cancelado', NULL);

-- Copiando estrutura para tabela barbearia_db.fidelidade
DROP TABLE IF EXISTS `fidelidade`;
CREATE TABLE IF NOT EXISTS `fidelidade` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `pontos` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_fidelidade_usuario` (`id_usuario`) USING BTREE,
  CONSTRAINT `fk_fidelidade_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.fidelidade: ~5 rows (aproximadamente)
DELETE FROM `fidelidade`;
INSERT INTO `fidelidade` (`id`, `id_usuario`, `pontos`) VALUES
	(1, 1, 40.00),
	(2, 2, 30.00),
	(3, 3, 20.00),
	(4, 4, 20.00),
	(5, 5, 15.00);

-- Copiando estrutura para tabela barbearia_db.funcionario
DROP TABLE IF EXISTS `funcionario`;
CREATE TABLE IF NOT EXISTS `funcionario` (
  `id_funcionario` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `funcao` varchar(100) NOT NULL,
  PRIMARY KEY (`id_funcionario`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.funcionario: ~5 rows (aproximadamente)
DELETE FROM `funcionario`;
INSERT INTO `funcionario` (`id_funcionario`, `nome`, `funcao`) VALUES
	(1, 'João Silva', 'Barbeiro Especialista'),
	(2, 'Pedro Souza', 'Barbeiro Master'),
	(3, 'Gustavo Lima', 'Estilista'),
	(4, 'Carlos Mendes', 'Barbeiro'),
	(5, 'Antonio Pedrosa Ragne', 'Limpa a Barbearia');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.reset_tokens: ~0 rows (aproximadamente)
DELETE FROM `reset_tokens`;

-- Copiando estrutura para tabela barbearia_db.servicos
DROP TABLE IF EXISTS `servicos`;
CREATE TABLE IF NOT EXISTS `servicos` (
  `id_servicos` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  `duracao` int(11) NOT NULL,
  `pontos` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_servicos`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.servicos: ~7 rows (aproximadamente)
DELETE FROM `servicos`;
INSERT INTO `servicos` (`id_servicos`, `nome`, `preco`, `duracao`, `pontos`, `status`) VALUES
	(1, 'Corte Masculino', 35.00, 30, 10, 1),
	(2, 'Barba Completa', 40.00, 30, 10, 1),
	(3, 'Corte + Barba', 65.00, 60, 20, 1),
	(4, 'Corte + Platinado', 90.00, 90, 25, 1),
	(5, 'Sobrancelha', 20.00, 15, 5, 1),
	(6, 'Hidratação Capilar', 50.00, 45, 15, 1),
	(7, 'Barba', 20.00, 20, 20, 1),
	(8, 'Barba', 80.00, 30, 100, 1);

-- Copiando estrutura para tabela barbearia_db.usuarios
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nome_completo` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(256) NOT NULL,
  `cep` varchar(10) NOT NULL,
  `primeiro_acesso` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_usuario`) USING BTREE,
  UNIQUE KEY `Email` (`email`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.usuarios: ~8 rows (aproximadamente)
DELETE FROM `usuarios`;
INSERT INTO `usuarios` (`id_usuario`, `nome_completo`, `email`, `senha`, `cep`, `primeiro_acesso`) VALUES
	(1, 'Joao Pedro', 'joao@gmail.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '12345678', 0),
	(2, 'Gustavo Alves', 'gus@gmail.com', '$2b$10$eEyDWOjiGg7KJa1c1lyLo.S4QDX9P7rqBssjr6KCU3/gv6mHzMjAW', '5161556165', 0),
	(3, 'Maria Fernanda', 'maria@gmail.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '01310100', 0),
	(4, 'Rafael Oliveira', 'rafael@hotmail.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '04538133', 0),
	(5, 'Carla Santos', 'carla@yahoo.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '22041011', 0),
	(6, 'Bruno Costa', 'bruno@gmail.com', '', '30130010', 1),
	(7, 'Ana Lima', 'ana@gmail.com', '', '40020020', 1),
	(9, 'Leonardo', 'leonardo@gmail.com', '$2b$10$32vkHxb2ri57AfuF0nxKOuc5QVWEKT9zC9CEbWVOSYNnzpNt4d70K', '12345678', 0);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
