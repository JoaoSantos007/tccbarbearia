const mysql = require("mysql2/promise") 
const conexao = mysql.createPool({ 
    host:"localhost", 
    user:"root", 
    password:"", 
    port:3306, 
    database:"barbearia_db", 
    waitForConnections:true, 
    connectionLimit:10, 
    queueLimit:0 
}) 
module.exports = conexao 