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
    doc += "const router = require(\'express\').Router(); \n";
    doc += "const verify = require(\'../verifytoken\'); \n";
    doc += "const Joi = require(\'joi\'); \n";
    doc += "const {db, getDonemClient}  = require(\'../../db/maincn\'); \n";
    doc += "const formatsql = require(\'../../routes/formatsql-promising\'); \n";
    doc += "\n";
    doc += "\n";
    doc += "const {createErrResp} = require(\'../../miscfuncs\'); \n";
    doc += "const { number } = require(\'joi\'); \n";

}

function Create_Validation() {
    doc += "const " + tableName + "Validation = data => { \n" +
        "const " + tableName + "Schema = Joi.object({ \n";

    for (let index = 0; index < fields.length; index++) {
        const element = fields[index];
        doc += element.name + " : Joi.any()";
        if (index !== (fields.length - 1)) {
            doc += " ,\n";
        } else {
            doc += " \n";
        }
    }
    doc += "}); \n";
    doc += `return ${tableName}Schema.validate(data); \n`;
    doc += "}; \n";
    doc += "\n";
    doc += "\n";
}

function Create_Authorization() {

    doc += "// Tüm servislerin geçiş noktasi, burada hem token valide ediliyor hemde second token olup olmadığı kontrol ediliyor. \n";
    doc += "router.use(verify,(req,res,next) => { \n";
    doc += "//console.log('calistim ' + req._payload._d_id); \n";
    doc += "if (!req._payload._d_id || req._payload._d_id==0 ){ \n";
    doc += "    return res.status(400).send(createErrResp('Error : invalid token non d_id')); \n";
    doc += "} \n";
    doc += "next(); \n";
    doc += "}); \n";
}

function Create_Post() {
    doc += "router.post('/', async (req, res) => { \n";
    doc += "let client;\n";
    doc += "try { \n";
    doc += "// validation of data\n";
    doc += `const validate = await ${tableName}Validation(req.body); \n`;
    doc += "if (validate.error) return res.status(400).send(createErrResp(\"VALIDATOR: \" + validate.error.message));\n";
    doc += "\n";
    doc += "client = await getDonemClient(req._payload._d_id); \n";
    doc += "client.connect(); \n";
    doc += "//DB INSERT \n";
    doc += `const sonuc = await client.query(\'INSERT INTO ${tableName} (`;

    let insert_fields = "";
    let value_str = "\' VALUES (";
    let body_str = "[";

    for (let index = 0; index < fields.length; index++) {
        const element = fields[index];
        insert_fields = insert_fields + " " + element.name;
        value_str = value_str + " $" + String(index + 1);
        body_str = body_str + "req.body." + element.name;
        if (index !== (fields.length - 1)) {
            insert_fields = insert_fields + ",";
            value_str = value_str + " ,";
            body_str = body_str + " , \n";
        } else {
            insert_fields = insert_fields + ") \' + \n";
            value_str = value_str + ") RETURNING *\', \n";
            body_str = body_str + "]); \n";
        }
    }

    doc += insert_fields + value_str + body_str;

    doc += "res.send(sonuc.rows[0]); \n";

    doc += "} catch (err) { \n";
    doc += "res.status(400).send(createErrResp(\'Error :\' + err.message + \' Error Body :\' + err)); \n";
    doc += "} finally {\n";
    doc += "    client.end(); \n";
    doc += "} \n";
    doc += "}); \n";
    doc += "\n";
    doc += "\n";
}

function Create_Put() {
    doc += "router.put('/',  async (req, res) => { \n";
    doc += "let client;\n";
    doc += "\n";
    doc += "try { \n";
    doc += "// validation of data\n";
    doc += `const validate = await ${tableName}Validation(req.body); \n`;
    doc += "if (validate.error) return res.status(400).send(createErrResp(\"VALIDATOR: \" + validate.error.message));\n";
    doc += "\n";
    doc += "if (String(req.body.base_code).trim().length == 0) return res.status(400).send(createErrResp('invalid base code')); \n";
    doc += "\n";
    doc += "\n";
    doc += "client = await getDonemClient(req._payload._d_id); \n";
    doc += "client.connect(); \n";

    doc += "//DB UPDATE \n";
    doc += `const sonuc = await client.query('UPDATE ${tableName} SET  `;

    let insert_fields = "";
    let body_str = "[";

    for (let index = 0; index < fields.length; index++) {
        const element = fields[index];
        if (index == 0) {
            insert_fields = insert_fields + " " + element.name + "= $" + String(index + 1) ;
        } else {
            insert_fields = insert_fields + " '" + element.name + "= $" + String(index + 1) ;
        }

        body_str = body_str + "req.body." + element.name;
        if (index !== (fields.length - 1)) {
            insert_fields = insert_fields + "\' , + \n";
            body_str = body_str + " , \n";
        } else {
            insert_fields = insert_fields + ` WHERE  ${fields[0].name} = $${fields.length + 1} RETURNING *\',  \n`;
            body_str = body_str + " ,\n";
            body_str = body_str + "String(req.body.base_code).trim() \n  ]); \n";
        }
    }

    doc += insert_fields + body_str;

    doc += "res.send(sonuc.rows[0]); \n \n";

    doc += "} catch (err) { \n";
    doc += "    res.status(400).send(createErrResp(\'Error :\' + err.message + \' Error Body :\' + err)); \n";
    doc += "} finally {\n";
    doc += "    client.end(); \n";
    doc += "} \n";
    doc += "}); \n";
    doc += "\n";
    doc += "\n";
}

function Create_get() {
    doc += "router.post('/get/', async (req, res) => { \n";
    doc += "let client;\n";
    doc += "\n";
    doc += "try { \n";
    doc += "    client = await getDonemClient(req._payload._d_id); \n";
    doc += "    client.connect(); \n";
    doc += "    const sqlQuery = await formatsql(req);\n";
    doc += "    //console.log(sqlQuery);\n";
    doc += "    const sonuc = await client.query(sqlQuery); \n";
    doc += "    res.send(sonuc.rows); \n";
    doc += " } catch (hata) { \n";
    doc += "    res.status(400).send(createErrResp(\'Error :\' + hata.message )); \n";
    doc += " } finally { \n";
    doc += "    client.end(); \n";
    doc += " } \n";
    doc += "}); \n \n";
}
function Create_Delete() {
    doc += "router.delete('/:kod', async (req, res) => { \n";
    doc += "    let client;\n";
    doc += "    try {\n";
    doc += "        // validation of data\n";
    doc += "        if (!req.params.kod) {\n";
    doc += "            return res.status(400).send(createErrResp(\"VALIDATOR: kod must be provided..\"));\n";
    doc += "        }\n";
    doc += "\n";
    doc += "        client = await getDonemClient(req._payload._d_id);\n";
    doc += "        client.connect(); \n";
    doc += "      \n";
    doc += "        const sonuc = await client.query('delete from " + tableName + " where " + tableName + "_kod = $1 RETURNING *',[String(req.params.kod).trim()]);\n";
    doc += "        let resp={};\n";
    doc += "        resp.resp =sonuc.rows[0]." + tableName + "_kod + ' deleted succesfully...'; \n";
    doc += "        res.send(resp);\n";
    doc += "    } catch (err) {\n";
    doc += "        res.status(400).send(createErrResp('Error :' + err.message + ' Error Body :' + err));\n";
    doc += "    } finally {\n";
    doc += "        client.end();\n";
    doc += "    }\n";
    doc += "});\n";
    doc += "\n";
    doc += "\n";
}

function Create_NewCode() {
    doc += "router.get('/getnewcode/', async (req, res) => {\n";
    doc += "    let client;\n";
    doc += "    try {\n";
    doc += "        client = await getDonemClient(req._payload._d_id);\n";
    doc += "        client.connect();\n";
    doc += "        let sonuc;\n";
    doc += "        sonuc = await client.query(\'select nextval(\'\'seq_" + tableName + "_kod\'\')  as n_kod ;\');\n";
    doc += "        let the_id = sonuc.rows[0].n_kod;\n";
    doc += "        let pre_kod ='';\n";
    doc += "        let kod_length = 0;\n";

    doc += "        sonuc = await client.query('select * from parameters where p_modul = $1',[\'" + tableName.toLocaleUpperCase('tr') + "\'] );\n";
    doc += "        sonuc.rows.forEach(element => {\n";
    doc += "            switch (element.parameter) {\n";
    doc += "                case \"PRE_KOD\":\n";
    doc += "                    pre_kod = element.par_value;\n";
    doc += "                    break;\n";
    doc += "                case \"KOD_LENGTH\":\n";
    doc += "                    kod_length = parseInt(element.par_value);\n";
    doc += "                    break;\n";
    doc += "                    \n";
    doc += "                default:\n";
    doc += "                    break;\n";
    doc += "            }\n";
    doc += "        });\n";
    doc += "        let resp= {};\n";
    doc += "        resp.kod = pre_kod + the_id.toString().padStart(kod_length - pre_kod.length, \'0\');\n";
    doc += "        res.status(200).send(resp);\n";
    doc += "    } catch (hata) {\n";
    doc += "        res.status(400).send(createErrResp(\'Error :\' + hata.message));\n";
    doc += "    } finally {\n";
    doc += "        client.end();\n";
    doc += "    }\n";
    doc += "});\n";

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
                Create_Authorization();
                Create_Validation();
                Create_Post();
                Create_Put();
                Create_get();
                Create_Delete();
                Create_NewCode();
                doc += "\n";
                doc += "module.exports = router;\n";
                console.log(doc);
                fs.writeFile(tableName + ".js", doc, function (err) {
                    if (err) throw err;

                    console.log("Saved to " + tableName + ".js");

                });

            }).catch(error => {
                client.release();
                console.log(error);
                return -1;
            });
    }).catch(error => {
        console.log(error);
        return -1;
    });

