const {db,admin} = require('./admin');
//this is a middle ware that is going to check if the token is set or not! if is true it will continue with the next req and resp
module.exports = async (req,res,next) => {
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split('Bearer ')[1];
        
        try {
            let decodedToken =  await admin.auth().verifyIdToken(token);
            req.user = decodedToken;
            const userInfo = await db.collection('users').where('userId','==',req.user.uid).limit(1).get();
            req.user.handle = userInfo.docs[0].data().handle;
            req.user.imageUrl = userInfo.docs[0].data().imageUrl;
            return next();
            
        } catch (err) {
            console.log(err)
            res.status(403).json({error:'The token provide is not aunthenticated'})
        }
    } else {
        return res.status(403).json({error: 'Unauthorized'});
    }
}