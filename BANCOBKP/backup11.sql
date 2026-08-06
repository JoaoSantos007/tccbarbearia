-- --------------------------------------------------------
-- Servidor:                     127.0.0.1
-- Versão do servidor:           10.4.32-MariaDB - mariadb.org binary distribution
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
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.agendamentos: ~12 rows (aproximadamente)
DELETE FROM `agendamentos`;
INSERT INTO `agendamentos` (`id`, `id_usuario`, `id_funcionario`, `data`, `status`, `feedback`, `forma_pagamento`) VALUES
	(43, 12, 1, '2026-05-07 18:30:00', 'concluido', NULL, 'Dinheiro'),
	(44, 6, 4, '2026-05-07 18:40:00', 'concluido', NULL, 'Pix'),
	(45, 13, 2, '2026-05-07 17:30:00', 'concluido', NULL, 'Dinheiro'),
	(47, 14, 1, '2026-05-08 19:30:00', 'concluido', NULL, 'Pix'),
	(48, 13, 6, '2026-05-09 12:30:00', 'concluido', NULL, 'Pix'),
	(49, 9, 6, '2026-05-09 12:30:00', 'concluido', NULL, NULL),
	(50, 14, 6, '2026-07-31 18:00:00', 'agendado', NULL, 'Pix'),
	(51, 13, 7, '2026-08-03 20:30:00', 'cancelado', NULL, 'Pix'),
	(53, 20, 4, '2026-08-07 14:00:00', 'agendado', NULL, 'Transferência'),
	(54, 19, 4, '2026-08-06 17:09:00', 'cancelado', NULL, 'Pix'),
	(55, 21, 2, '2026-08-12 22:22:00', 'agendado', NULL, 'Pix'),
	(56, 22, 7, '2026-08-06 18:19:00', 'concluido', NULL, 'Cartão Crédito'),
	(58, 24, 4, '2025-03-06 20:06:00', 'agendado', NULL, NULL);

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

-- Copiando dados para a tabela barbearia_db.agendavalor: ~37 rows (aproximadamente)
DELETE FROM `agendavalor`;
INSERT INTO `agendavalor` (`tipo_servico`, `valor`, `id_agendamento`) VALUES
	(5, 10.00, 43),
	(2, 25.00, 43),
	(1, 30.00, 43),
	(3, 150.00, 44),
	(2, 25.00, 44),
	(1, 30.00, 44),
	(5, 10.00, 45),
	(4, 40.00, 45),
	(3, 150.00, 45),
	(2, 25.00, 45),
	(1, 30.00, 45),
	(5, 10.00, 48),
	(4, 40.00, 48),
	(3, 150.00, 48),
	(2, 25.00, 48),
	(1, 30.00, 48),
	(5, 10.00, 47),
	(4, 40.00, 47),
	(2, 25.00, 47),
	(5, 10.00, 49),
	(1, 30.00, 49),
	(3, 150.00, 50),
	(1, 30.00, 50),
	(4, 40.00, 53),
	(3, 150.00, 53),
	(2, 25.00, 53),
	(5, 10.00, 51),
	(1, 30.00, 51),
	(5, 10.00, 54),
	(2, 25.00, 54),
	(6, 45.00, 55),
	(6, 45.00, 56),
	(5, 10.00, 56),
	(4, 40.00, 56),
	(3, 150.00, 56),
	(2, 25.00, 56),
	(1, 30.00, 56),
	(6, 45.00, 58),
	(5, 10.00, 58),
	(4, 40.00, 58),
	(3, 150.00, 58),
	(2, 25.00, 58),
	(1, 30.00, 58);

-- Copiando estrutura para tabela barbearia_db.fidelidade
DROP TABLE IF EXISTS `fidelidade`;
CREATE TABLE IF NOT EXISTS `fidelidade` (
  `id_usuario` int(11) NOT NULL,
  `pontos` decimal(10,2) NOT NULL DEFAULT 0.00,
  KEY `fk_fidelidade_usuario` (`id_usuario`) USING BTREE,
  CONSTRAINT `fk_fidelidade_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.fidelidade: ~6 rows (aproximadamente)
DELETE FROM `fidelidade`;
INSERT INTO `fidelidade` (`id_usuario`, `pontos`) VALUES
	(12, 23.00),
	(6, 28.00),
	(13, 1.00),
	(14, 28.00),
	(9, 15.00),
	(22, 18.00);

-- Copiando estrutura para tabela barbearia_db.funcionario
DROP TABLE IF EXISTS `funcionario`;
CREATE TABLE IF NOT EXISTS `funcionario` (
  `id_funcionario` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `funcao` varchar(100) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_funcionario`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.funcionario: ~7 rows (aproximadamente)
DELETE FROM `funcionario`;
INSERT INTO `funcionario` (`id_funcionario`, `nome`, `funcao`, `status`) VALUES
	(1, 'João Silva', 'empresario', 0),
	(2, 'Pedro Souza', 'Barbeiro', 1),
	(4, 'Carlos Mendes', 'Barbeiro', 1),
	(6, 'Gabriel Sampaio', 'Barbeiro Iniciante', 1),
	(7, 'Enzo Serra', 'Barbeiro', 1),
	(8, 'Carlos', 'Limpeza', 1);

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.historico_resgates: ~3 rows (aproximadamente)
DELETE FROM `historico_resgates`;
INSERT INTO `historico_resgates` (`id`, `id_usuario`, `id_servico`, `pontos_gastos`, `data_resgate`) VALUES
	(1, 6, 5, 50.00, '2026-05-07 17:16:03'),
	(2, 13, 1, 100.00, '2026-05-07 17:21:55'),
	(3, 13, 1, 100.00, '2026-08-06 14:10:28'),
	(4, 22, 1, 100.00, '2026-08-06 16:20:11');

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.servicos: ~6 rows (aproximadamente)
DELETE FROM `servicos`;
INSERT INTO `servicos` (`id_servicos`, `nome`, `preco`, `duracao`, `pontos`, `status`, `pontos_resgate`) VALUES
	(1, 'Corte de Cabelo', 30.00, 30, 10, 1, 100),
	(2, 'Barba', 25.00, 25, 8, 1, 80),
	(3, 'Platinado', 150.00, 120, 60, 1, 500),
	(4, 'Hidratação Capilar', 40.00, 40, 15, 1, 150),
	(5, 'Sombrancelha', 10.00, 10, 5, 1, 50),
	(6, 'Cílios', 45.00, 40, 20, 1, 100);

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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela barbearia_db.usuarios: ~19 rows (aproximadamente)
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
	(12, 'Kaua', 'kaua@gmail.com', '$2b$10$TSGTe4zFm7mz2eriey1xgeVQvG16MbsI2T6IMBBWOF4u/G5DuqlpW', '12345678', 0),
	(13, 'Antonio', 'antonio@gmail.com', '$2b$10$.ajbKwthWr4BqQcu889g8eIO5bbSdZs3kjbEW1X00b5q7Jn8927/W', '13265478', 0),
	(14, 'Matheus Bernardes Rodrigues', 'rodriguinho@gmail.com', '$2b$10$7uV9iZ2HbE6FAV3Y75Nww..wCe7BdPENInFLGxupl.RUHPqFdWrIK', '12345678', 0),
	(16, 'Samuel', 'samuel@gmail.com', '$2b$10$uhYE.fvy6ssci84hlWCyo.g/aU4Tpdz9CmLy0PFFbm2IVVw/uF9By', '12', 0),
	(17, 'Samuel Medroso', 'samuel2222@gmail.com', '$2b$10$.0F8fAtcqZFAWADJRwwJM.z1CuFgThnw5hceeVBDVAHrAqwCpOwz.', '12345677', 0),
	(19, 'matheus bernardes', 'math77@gmail.com', '$2b$10$NdI5FxGBiRiMY2HT7LSpSuZ0TDBx/iDwYfrWJmPEtgJjcwOAi7yOO', '12234567', 0),
	(20, 'Luis Antonio Rodrigues', 'luisantonio@gmail.com', '$2b$10$JwRVsWRXXFXqdaKBhnuOOuDCbA1y8xGPqg.JgP1/ETMvqxOSHzlVi', '23456775', 0),
	(21, 'Bruna Lima', 'bruna@gmail.com', '$2b$10$6Yg9Iu4Z2sJSpSykCDt0eOG3eEseUg3/9pnTggJXKyvAVUt5JQbjy', '19165093', 0),
	(22, 'Melina Pontes', 'mel@email.com', '$2b$10$2A5WNZ3TUNGB4tI9N9BS9eWqHme3jNpQE8T1HGVLb4Zl4QW8JDQbS', '12234567', 0),
	(24, 'Pedro Hidelbrando', 'pedrao@gmail.com', '$2b$10$9.mjoaSt9offpl8l6tT13OFmmE7VdJDzvRjdG.ehJIFcnfPNj7AgO', '12345678', 0);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
