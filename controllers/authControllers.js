const passport = require("passport");
const bcryptjs = require("bcryptjs");
const nodemailer = require("nodemailer");
const {google} = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const jwt = require("jsonwebtoken");
const JWT_KEY = "cequejeveux";
const JWT_RESET_KEY = "cequejeveuxici";

const User = require('../models/User');
const { oauth2 } = require("googleapis/build/src/apis/oauth2");

function isValidPassword(password){
    const regex = /^(?=.*[\W_]).{8,}$/; // Au moins 8 caractères et un caractère spécial
}

exports.registerHandle = (req, res) => {
    const {name, email, password, password2} = req.body;
    let errors = [];

    if(!name || !email || !password || !password2){
        errors.push({msg: 'Merci de rentrer tout les champs'});
    }

    if(password != password2){
        errors.push({msg: 'Les mots de passes ne correspondent pas'});//je peux mettre ce que je veux de cette maniere
    }

    if(!isValidPassword(password)){
        errors.push({msg: 'Le mot de passe doit au moins 8 caractères et un caractère spécial'});
    }

    if(errors.length > 0){
        res.render('register', {
            errors, 
            name,
            email,
            password,
            password2
        });
    }else{
        //rechercher si le mail rentrer dans notre formulaire existe deja dans notre base de donnée
        User.findOne({email: email}).then(user => {//acolade {} car c'est du json / then signifie une promesse de succès 'que ca va marcher'    //user en u miniscule car c'est du traitement de donnée
            if(user){//user en miniscule encore car traitement de donnée
                errors.push({msg: 'Votre adresse email est déjà associée a un compte'});
                res.render('register', {
                    errors,
                    name,
                    email,
                    password,
                    password2
                });
            }else{
                const oauth2Client = new OAuth2(    //oautch petite bx qui permet davoir un token de la par de google
                    "CLIENTS_ID",//DONNE COMPTE PERSONNEL GOOGLE API
                    "CLIENTS_SECRET",//DONNE COMPTE PERSONNEL GOOGLE API
                    "REDIRECT_URL"//DONNE COMPTE PERSONNEL GOOGLE API
                );
                oauth2Client.setCredentials({   //suite de lenvoie du token dauthentification
                    refresh_token: "xxx" //token d'authentification envoyer par google "avec une durée de vie en fonction de la societée(google, pinterest etc..)"
                });

                const accessToken = oauth2Client.getAccessToken();//écris juste un chemin pour crée un token

                const token = jwt.sign({name, email, password}, JWT_KEY, {expiresIn: '30m'});//peload function de json web tken qui permet de prendre plusieurs info a transferer dans mon URL      //  jwt sert a crée un token en json 'un peux plus tard lors du transporter vers email'
                const CLIENT_URL = 'http://' + req.headers.host;// espace + espace = concatenation

                //contenu email 'en HTML'
                const output = `
                    <h2>Cliquer sur le lien suivant pour activer votre compte</h2>
                    <p>${CLIENT_URL}/auth/activate/${token}</p>
                    <p><b>NOTE: </b>Le lien expire dans 30 minutes</p>
                `;


                const transporter = nodemailer.createTransport({//serrt a exporter le mail de chez nous vers quelqu'un
                    service: 'gmail',
                    auth: {
                        type: "OAuth2",//s'écri de la meme manière partout
                        user: "xxx@gmail.com",
                        clientId: "xxx",
                        clientSecret: "xxx",
                        refreshToken: "xxx",
                        accessToken: accessToken
                    },
                });

                const mailOptions = {   //configuerer qui emet et recoit nos email
                    from: '"eliass" <xxx@gmail.com>',//de qui viens le mail//le mail va a la personne qui a envoyer le mail
                    to: email,//le mail est celui qu'il à écrit dans son formulaire d'inscription
                    subject: "Verification nodeJS authentification",//sujet du mail
                    generateTextFromHTML: true,//generer l'email en HTML
                    HTML: output,//dire que l'ont soite envoyer notre constante output au destinataire du mail
                };

                transporter.sendMail(mailOptions, (errors, info) =>{   //transporter le mail entre ton pc, ton API google et le mail envoyer a l'utilisateur
                    if(errors){
                        req.flash('error_msg', 'Une erreur est survenue dans l\'envoie de votre mail');//function flash = envoie une donnée sur ton front-office / veux dire qu'il y a une erreur dans votre mail
                        res.redirect('/auth/login');//renvoie l'utilisateur vers la page de login 'en cas de code erreur'
                    }else{
                        req.flash('success_msg', 'Un lien d\'activation vous à été envoyé par email');//function flash = envoie une donnée sur ton front-office
                        res.redirect('/auth/login');//renvoie l'utilisateur vers la page de login 'en cas de code erreur'
                    }
                });
            }
        });
    }
}

//cryptage json web token permet de le decripter plus tard pour recuperer les données
//ne pas oublier ces infos la//
//pas de base de donnée ACTUELLEMENT
//seulement du cryptage
//cryptage = token
//le token est valable autant de fois que l'ont l'appel 
//peux-nous sérvir à récupérer les données mais la différence avec la base de donnée ''
//c'est comme ziper les données avec et à l'interieur du token et ensuite ont le désipe