const {db, admin} = require('../utilities/admin');
const firebaseConfig = require('../utilities/config');
const validate = require('../utilities/validate');
const jo = require('jpeg-autorotate')
//auth
const firebaseAuth = require('firebase');
firebaseAuth.initializeApp(firebaseConfig);

exports.signUp = async (req,res) =>{
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }

//TODO validate data
let validate_errors = {}
for (let info in newUser) {
    
    if(validate(newUser[info],'isEmpty')) validate_errors[info] = `Please complete this field.`;
}
if (validate(newUser.email,'NotEmail')) validate_errors.email = `Please add a valid Email`;
if (validate({pass:newUser.password,pass2:newUser.confirmPassword},'notPassword')) validate_errors.confirmPassword = `Password doesnt match`;
if (Object.keys(validate_errors).length) {
    return res.status(400).json({...validate_errors})
}

//send the request to firebase to create the newUser
try {
    const newHandler = await db.doc(`/users/${newUser.handle}`).get();
    if (newHandler.exists) {
        res.status(400).json({handle: 'This handle is already taken'});
    } else {
        const data =  await firebaseAuth.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
        const token = await data.user.getIdToken();
        const userCredentials = {
            userId: data.user.uid,
            handle: newUser.handle,
            email: newUser.email,
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/no-name.png?alt=media`,
            createdAt: new Date().toISOString()
        }
        const newUserPersonal = await db.doc(`/users/${userCredentials.handle}`).set(userCredentials);
        res.status(201).json({token})
    }
} catch (err) {
    if (err.code === "auth/email-already-in-use") {
        res.status(400).json({email: 'auth/Email is already in use'})
    } else {
        res.status(500).json({general: 'Something went wrong, Please try again'})
    }
    
}

}

exports.singIn =  async(req,res)=> {

    const verifyUser = {
        email: req.body.email,
        password: req.body.password
    }
    let errors = {}
    if(validate(verifyUser.email,"NotEmail")) errors.email = "Please add a valid Email";

    for (let verify in verifyUser) {
        if (validate(verifyUser[verify], "isEmpty")) errors[verify] = `Please complete this field.`;
    }
    

    if (Object.keys(errors).length) return res.status(400).json({...errors});

    try {
        const data = await firebaseAuth.auth().signInWithEmailAndPassword(verifyUser.email, verifyUser.password);
        const token = await data.user.getIdToken();
        res.status(200).json({token})
    } catch (err) {
        if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
            res.status(403).json({general:"Wrong Credentials, Please try again"})
        } else {
            res.status(500).json({general: 'Something went wrong, Please try again.'})
        } 
    }
}
//update any information in the user collection
exports.userDetailsUpdate = async (req, res) => {
    let updater = {};
    for (let prop in req.body) {
        if (!validate(req.body[prop], "isEmpty")) updater[prop] = req.body[prop];
    }

    if (updater.website && !updater.website.startsWith("http")) {
        updater.website = `http://${updater.website}`;
    }

    try {
        const data = await db.doc(`/users/${req.user.handle}`).update({...updater});
        res.status(200).json({message: `Information has been updated in user ${req.user.uid}`})
    } catch (err) {
        res.status(500).json({err});
    }
}
//GetUserInformation 
exports.getUserInformation = async (req, res) => {

    let userInfo = {};
    try {
        const data = await db.doc(`/users/${req.user.handle}`).get();
        if (data.exists) {
            userInfo.credentials = data.data();
            userInfo.likes = [];
            const likes = await db.collection('likes').where('userHandle', '==', req.user.handle).orderBy('createdAt', 'desc').get();
            likes.forEach(element => {
                userInfo.likes.push(element.data());
            });
            userInfo.notification = [];
            const notification = await db.collection('notifications').where('recipient', '==', req.user.handle).where('read', '==', false)
                .orderBy('createdAt', 'desc').get();
            notification.forEach(element => {
                userInfo.notification.push({
                    ...element.data(),
                    notificationId: element.id
                })
            })
            res.status(200).json({...userInfo})
        } else {
            res.status(400).json({message: 'user doesnt exists'});
        } 
    } catch (err) {
        console.log(err)
        res.status(500).json({err});
    }
}
//getAnyUserInformation also screams
exports. getUserDetails = async (req,res) => {
    try {
        const userFounded = await db.doc(`/users/${req.params.handle}`).get();
        if (userFounded.exists) {
            let userInfo = {
                credentials:userFounded.data(),
                screams : []
            };
            const screams = await db.collection('screams').where('userHandle','==',req.params.handle).orderBy('createdAt','desc').get();
            screams.forEach(element => {
                userInfo.screams.push({screamId: element.id,...element.data()});
            });
            res.status(200).json({userInfo})
        } else {
            res.status(404).json({message: 'User doesn\'t exist'})
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({err});
    }
}
//mark one or multiple notifications as read
exports.markNotificationsRead = async (req,res) => {
    let batch = db.batch();
    req.body.forEach(elementId => {
        const notification = db.doc(`/notifications/${elementId}`);
        batch.update(notification, {read:true});
    })

    try {
        await batch.commit();
        res.status(200).json({message:'All the notifications has been marked as read'});
    } catch (err) {
        res.status(500).json({err})
    }
};
// how to upload information 
exports.uploadImage = async (req,res)=>{
    const path = require('path'),
    os = require('os'),
    fs = require('fs'),
    Busboy = require('busboy');
    const busboy = new Busboy({headers: req.headers});
    let imageFileName;
    let imageToBeUploaded = {};
    busboy.on('file', async (fieldname, file, filename, encoding, mimetype) =>{
        
        //accesing the .jpeg or .png
        const imageExtension = filename.split('.')[filename.split('.').length-1];
        //232234243432.jpeg
        imageFileName = `${Math.round(Math.random()*100000000000)}.${imageExtension}`;
        const filePath = path.join(os.tmpdir(),imageFileName);
        try {
            
            imageToBeUploaded = {filePath, mimetype };
            console.log({fieldname}, {file}, {filename}, {encoding}, {mimetype},{imageExtension},{imageFileName},{filePath},{imageToBeUploaded})
            
            // this is going to create the file
            file.pipe(fs.createWriteStream(filePath))
            
        } catch (err) {
            console.log(err)
            res.status(500).json({err})
        }
        
    })
    busboy.on('finish', async ()=>{
        try {
            const data = await admin.storage().bucket().upload(imageToBeUploaded.filePath,{
                resumable:false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.filePath
                    }
                }
            })
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
            const result = await db.doc(`/users/${req.user.handle}`).update({imageUrl});
            console.log(result)
            res.status(200).json({message: 'Message uploaded succesfully'});
        } catch (err) {
            console.log(err);
            res.status(500).json({error: err.code})
        }
    })
    busboy.end(req.rawBody);
}