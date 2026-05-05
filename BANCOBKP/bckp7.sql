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
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(15) NOT NULL,
  `feedback` varchar(300) DEFAULT NULL,
  `forma_pagamento` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_agendamento_usuario` (`id_usuario`) USING BTREE,
  KEY `fk_agendamento_funcionario` (`id_funcionario`) USING BTREE,
  CONSTRAINT `fk_agendamento_funcionario` FOREIGN KEY (`id_funcionario`) REFERENCES `funcionario` (`id_funcionario`),
  CONSTRAINT `fk_agendamento_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.agendamentos: ~1 rows (aproximadamente)
DELETE FROM `agendamentos`;
INSERT INTO `agendamentos` (`id`, `id_usuario`, `id_funcionario`, `data`, `status`, `feedback`, `forma_pagamento`) VALUES
	(42, 9, 1, '2026-05-06 20:15:00', 'agendado', NULL, NULL);

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

-- Copiando dados para a tabela barbearia_db.agendavalor: ~2 rows (aproximadamente)
DELETE FROM `agendavalor`;
INSERT INTO `agendavalor` (`tipo_servico`, `valor`, `id_agendamento`) VALUES
	(2, 25.00, 42),
	(1, 30.00, 42);

-- Copiando estrutura para tabela barbearia_db.fidelidade
DROP TABLE IF EXISTS `fidelidade`;
CREATE TABLE IF NOT EXISTS `fidelidade` (
  `id_usuario` int(11) NOT NULL,
  `pontos` decimal(10,2) NOT NULL DEFAULT 0.00,
  KEY `fk_fidelidade_usuario` (`id_usuario`) USING BTREE,
  CONSTRAINT `fk_fidelidade_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.fidelidade: ~0 rows (aproximadamente)
DELETE FROM `fidelidade`;

-- Copiando estrutura para tabela barbearia_db.funcionario
DROP TABLE IF EXISTS `funcionario`;
CREATE TABLE IF NOT EXISTS `funcionario` (
  `id_funcionario` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `funcao` varchar(100) NOT NULL,
  PRIMARY KEY (`id_funcionario`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.funcionario: ~4 rows (aproximadamente)
DELETE FROM `funcionario`;
INSERT INTO `funcionario` (`id_funcionario`, `nome`, `funcao`) VALUES
	(1, 'João Silva', 'Barbeiro Especialista'),
	(2, 'Pedro Souza', 'Barbeiro Master'),
	(3, 'Gustavo Lima', 'Estilista'),
	(4, 'Carlos Mendes', 'Barbeiro');

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
  `pontos_resgate` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_servicos`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.servicos: ~4 rows (aproximadamente)
DELETE FROM `servicos`;
INSERT INTO `servicos` (`id_servicos`, `nome`, `preco`, `duracao`, `pontos`, `status`, `pontos_resgate`) VALUES
	(1, 'Corte de Cabelo', 30.00, 30, 10, 1, NULL),
	(2, 'Barba', 25.00, 25, 8, 1, NULL),
	(3, 'Platinado', 150.00, 120, 60, 1, NULL),
	(4, 'Hidratação Capilar', 40.00, 40, 15, 1, NULL);

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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.usuarios: ~10 rows (aproximadamente)
DELETE FROM `usuarios`;
INSERT INTO `usuarios` (`id_usuario`, `nome_completo`, `email`, `senha`, `cep`, `primeiro_acesso`) VALUES
	(1, 'Joao Pedro', 'joao@gmail.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '12345678', 0),
	(2, 'Gustavo Alves', 'gus@gmail.com', '$2b$10$eEyDWOjiGg7KJa1c1lyLo.S4QDX9P7rqBssjr6KCU3/gv6mHzMjAW', '5161556165', 0),
	(3, 'Maria Fernanda', 'maria@gmail.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '01310100', 0),
	(4, 'Rafael Oliveira', 'rafael@hotmail.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '04538133', 0),
	(5, 'Carla Santos', 'carla@yahoo.com', '$2b$10$vJHIiRkGhB/rsXfWVde3GOHYC5OKdnE0.QEfxEFocCEdU8chowLR6', '22041011', 0),
	(6, 'Bruno Costa', 'bruno@gmail.com', '', '30130010', 1),
	(7, 'Ana Lima', 'ana@gmail.com', '$2b$10$XozFdVNFwDENnQfcmsIC8.zLi3l5c8VwbaAUyM4IH3EI8CbS7e2Vm', '40020020', 0),
	(9, 'Leonardo', 'leonardo@gmail.com', '$2b$10$32vkHxb2ri57AfuF0nxKOuc5QVWEKT9zC9CEbWVOSYNnzpNt4d70K', '12345678', 0),
	(10, 'Ana Lima', 'ana2@gmail.com', '$2b$10$6icfWrUAsmgkayMrlBRt1evtzPi6VXHyTda7Htr.39cPbFt5U.OYW', '12345678', 0),
	(11, 'felipe', 'leo@gmail.com', '$2b$10$vdZ5aDY4zRauokMG6v2BlOgfW.QWTSnMiAIQZpCPACAFjE0bTz/zq', '18028040', 0);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
