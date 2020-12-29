const fs = require('fs');
const {
    Pool
} = require('pg');
const url = require('url');
const dotenv = require('dotenv');
dotenv.config();

let doc = "";
let fields;
//console.log (process.argv);
var myArgs = process.argv.slice(2);
if (myArgs.length == 0) {
    console.log('Please supply the arguments');
    return -1;
}
const dataBase = myArgs[0];
const tableName = myArgs[1];

function Create_Entry_Template() {
    doc += "const router = require(\'express\').Router(); \n" +
        "const verify = require(\'../verifytoken\'); \n" +
        "const Joi = require(\'joi\'); \n" +
        "const db = require(\'../../db/donempool\').donemPool; \n" +
        "const formatsql = require(\'../../routes/formatsql-promising\'); \n" +
        "\n" +
        "\n";
}

function Create_Validation() {
    doc += "const " + tableName + "Validation = data => { \n" +
        "const cariSchema = Joi.object({ \n";

    for (let index = 0; index < fields.length; index++) {
        const element = fields[index];
        doc += element.name + " : Joi.any()";
        if (index !== (fields.length - 1)) {
            doc += " ,\n";
        } else {
            doc += " \n";
        }
    }
    doc += "}); \n"
    doc += `return ${tableName}Schema.validate(data); \n`
    doc += "}; \n";
    doc += "\n";
    doc += "\n";
}

function Create_Post() {
    doc += "router.post('/', verify, async (req, res) => { \n";
    doc += "\n";
    doc += "try { \n";
    doc += "// validation of data\n";
    doc += `const validate = await ${tableName}Validation(req.body); \n`;
    doc += "if (validate.error) return res.status(400).send(\"VALIDATOR: \" + validate.error.message);\n";
    doc += "\n";
    doc += "//DB INSERT \n";
    doc += `const sonuc = await db.query(\'INSERT INTO ${tableName} (`
   
    let insert_fields = "";
    let value_str = "\' VALUES (";
    let body_str = "["    

    for (let index = 0; index < fields.length; index++) {
        const element = fields[index];
        insert_fields = insert_fields + " " +element.name ;
        value_str = value_str + " $" + String(index + 1) ;
        body_str = body_str + "req.body." + element.name ;      
        if (index !== (fields.length - 1)) {
            insert_fields = insert_fields + ",";     
            value_str = value_str + " ,";
            body_str = body_str + " , \n"
        } else {
            insert_fields = insert_fields + ") \' + \n"
            value_str = value_str + ") RETURNING *\', \n";
            body_str = body_str + "]); \n";
        }
    }
    
    doc += insert_fields + value_str + body_str;
  
    doc += "res.send(sonuc.rows[0]); \n";

    doc += "} catch (err) { \n";
    doc += "res.status(400).send(\"DATABASE :\" + err.message); \n";
    doc += "} \n";
    doc += "}); \n";
    doc += "\n";
    doc += "\n";   
}

function Create_Put() {
    doc += "router.put('/', verify, async (req, res) => { \n";
    doc += "\n";
    doc += "try { \n";
    doc += "// validation of data\n";
    doc += `const validate = await ${tableName}Validation(req.body); \n`;
    doc += "if (validate.error) return res.status(400).send(\"VALIDATOR: \" + validate.error.message);\n";
    doc += "\n";
    doc += "if (String(req.body.base_code).trim().length == 0) return res.status(400).send('invalid base code'); \n" 
    doc += "//DB UPDATE \n";
    doc += `const sonuc = await db.query('UPDATE ${tableName} SET  `
   
    let insert_fields = "";
    let body_str = "[";    

    for (let index = 0; index < fields.length; index++) {
        const element = fields[index];
        if (index == 0){
            insert_fields = insert_fields + " " +element.name + "= $" + String(index + 1) ;                
        } else {
            insert_fields = insert_fields + " '" +element.name + "= $" + String(index + 1) ;
        }
        
         body_str = body_str + "req.body." + element.name ;      
        if (index !== (fields.length - 1)) {
            insert_fields = insert_fields + "\' + \n";     
            body_str = body_str + " , \n"
        } else {
            insert_fields = insert_fields + ` WHERE  lower(${fields[0].name}) = $${fields.length + 1} RETURNING *\',  \n`; 
            body_str = body_str + " ,\n";
            body_str = body_str + "String(req.body.base_code).trim().toLocaleLowerCase('tr') \n  ]); \n";
        }
    }
    
    doc += insert_fields + body_str;
  
    doc += "res.send(sonuc.rows[0]); \n \n";

    doc += "} catch (err) { \n";
    doc += "res.status(400).send(\"DATABASE :\" + err.message); \n";
    doc += "} \n";
    doc += "}); \n";
    doc += "\n";
    doc += "\n";   
}

function Create_get() {
    doc += "router.get('/', verify, (req, res) => { \n";
    doc += "\n";
    doc += "formatsql(req).then(sqlQuery => { \n";
    doc += "//console.log(sqlQuery);\n";
    doc += "db.query(sqlQuery).then(sonuc => { res.send(sonuc.rows); }) \n";
    doc += ".catch(err => res.status(400).send(sqlQuery + err.message)); \n";
    doc += "}).catch(error => res.status(400).send(error)); \n \n"; 
    doc += "}); \n \n";
    doc += "module.exports = router; \n \n \n";
}

let CnString = '';
switch (dataBase) {
    case 'donem':
        CnString = process.env.DONEM_DB;

        break;
    case 'main':
        CnString = process.env.MAIN_DB;

        break;

    default:
        //default donem
        CnString = process.env.DONEM_DB;
        break;
}

const params = url.parse(CnString);
const auth = params.auth.split(':');

const config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: {
        rejectUnauthorized: false
    },
    idleTimeoutMillis: 1000, // close idle clients after 1 second
    connectionTimeoutMillis: 5000, // return an error after 1 second if connection could not be established
    maxUses: 7500, // close (and replace) a connection after it has been used 7500 times (see below for discussion)
};

let connected = false;

const pool = new Pool(config);

pool.connect()
    .then(client => {
        return client.query("SELECT * FROM " + tableName + " LIMIT 1")
            .then(mainrows => {
                client.release();
                console.log('Client Connected at ' + Date.now().toLocaleString());
                console.log("Getting table properties " + tableName);
                fields = mainrows.fields;
                Create_Entry_Template();
                Create_Validation();
                Create_Post();
                Create_Put();
                Create_get();    
                console.log(doc);
                fs.writeFile(tableName+".js",doc,function(err){
                    if (err) throw err;
                    
                    console.log("Saved to "+ tableName+".js");
                    
                });

            }).catch(error => {
                client.release();
                console.log(error);
                return -1;
            })
    }).catch(error => {
        console.log(error);
        return -1;
    });

