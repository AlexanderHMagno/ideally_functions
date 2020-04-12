const {db} = require('../utilities/admin');
const Validate = require('../utilities/validate');

exports.getAllScreams = async (req,res) =>
{
    try {
        let data = await db.collection('screams').orderBy('createdAt','desc').get();
        let screams =[];
        data.forEach(doc=> screams.push({screamId:doc.id,...doc.data()}));
        return res.json(screams);
    } catch (err) {
        res.status(500).json({message: err})
    }
}

exports.addScream = async( req,res) =>{
    let screamInfo = {
        body : req.body.body,
        userHandle : req.user.handle,
        createdAt: new Date().toISOString(),
        imageUrl: req.user.imageUrl,
        likesCount: 0,
        commentCount: 0
    }
    try {
        let data = await db.collection('screams').add(screamInfo)
        screamInfo = {...screamInfo, screamId:data.id}
        res.status(200).json({message: `document ${data.id} was created succesfully`,screamInfo })
    } catch (error) {
        res.status(500).json({message: 'Please provide the correct arguments'})
    }
}

exports.getScream = async (req, res) => {
    let allScream = {};
    let screamId = req.params.screamId;

    try {
        const data = await db.doc(`/screams/${screamId}`).get();
        if (data.exists) {
            allScream.screamInfo = data.data();
            allScream.comments = [];
            const comments = await db.collection('comments').where('screamId', '==', screamId).orderBy('createdAt','desc').get();
            comments.forEach(element => {
                allScream.comments.push(element.data());
            });
            
            res.status(200).json(allScream);
        } else {
            res.status(400).json({message:'Scream doesnt exist'})
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({err});
    }

}
//add a comment to a post
exports.postScreamComment = async (req, res) => {
    if (Validate(req.body.body, "isEmpty")) return res.status(400).json({comment:'Message was empty'});
    let newComment = {
        userHandle: req.user.handle,
        screamId: req.params.screamId,
        body: req.body.body,
        createdAt: new Date().toISOString(),
        //what happens if the user changes the image? doesnt make sense to have to update it in different places
        imageUrl:req.user.imageUrl
    }

    try {
        //check if there is a scream with the id
        const scream = await db.doc(`screams/${req.params.screamId}`).get();
        if (scream.exists) {
            //add the scream
            await db.collection('comments').add(newComment);
            console.log(scream.data())
            await db.doc(`screams/${req.params.screamId}`).update({'commentCount': scream.data().commentCount + 1})
            console.log(scream.data())

            let screamInfo = {screamInfo:scream.data(),newComment}
            res.status(200).json({message: `comment has been added`,screamInfo})
        } else {
            res.status(400).json({error: `Scream doesnt exists`})
        }   
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
    
}

exports.likeScream = async (req, res) => {
    const Addlike = {
        userHandle: req.user.handle,
        screamId:req.params.screamId,
        createdAt: new Date().toISOString()
    }
    try{
        const likeAlreadySet = await db.collection('likes').where('userHandle', '==', req.user.handle)
            .where('screamId','==', req.params.screamId).limit(1).get();
        
        if (likeAlreadySet.empty) {
            const data = await db.doc(`/screams/${req.params.screamId}`).get()
            if (data.exists) {
                let newLikeCount = {likesCount:1}
                let screamInfo = data.data();
                if (screamInfo.likesCount) newLikeCount.likesCount = screamInfo.likesCount+1;
                await db.doc(`/screams/${req.params.screamId}`).update(newLikeCount);
                await db.collection('likes').add(Addlike);
                screamInfo = {...screamInfo,...newLikeCount, screamId:data.id}
                res.status(200).json({message: 'Like has been added', screamInfo})   
            } else {
                res.status(400).json({message: 'Scream doesnt exits'})
            }
        } else {
            res.status(400).json({message: 'User has already liked this scream'})
        }

    } catch (err) {
        console.log(err);
        res.status(500).json(err)
    }
}

exports.unlikeScream = async(req,res) => {

    try {

        const likeAlreadySet = await db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('screamId','==', req.params.screamId).limit(1).get();
        
        if (!likeAlreadySet.empty) {

            // likeAlreadySet.doc.ref.delete();
            likeAlreadySet.forEach(async element =>  await element.ref.delete())

            // reduce the current likes 

            const scream = await db.doc(`/screams/${req.params.screamId}`).get();
            let screamInfo = scream.data();
            let newLikeCounter = {likesCount:0};       
            if (screamInfo.likesCount) {
                newLikeCounter.likesCount = screamInfo.likesCount -1;
            }
            //update scream 
            await db.doc(`/screams/${req.params.screamId}`).update(newLikeCounter);

            //reduce the number of likes
            screamInfo = {...screamInfo, ...newLikeCounter, screamId:scream.id};
            res.status(200).json({message: 'Like has been removed', screamInfo});
        } else {
            res.status(400).json({message: 'This post has not been liked by the user'})
        }

    } catch (err) {
        console.log(err)
        res.status(500).json({err})
    }
}

//delete a Screem 

exports.deleteScream = async (req,res) => {
    const scream = db.doc(`/screams/${req.params.screamId}`);
    const getScream = await scream.get();

    if (getScream.exists) {
        //there are likes to this scream
        //there are comments
        //delete scream
        if (getScream.data().userHandle !== req.user.handle) {
            res.status(403).json({error: 'this scream doesnt belong to you'})
        } else {
            await scream.delete();
            res.status(200).json({message: 'screams has been deleted'});
        }

    } else {
        res.status(400).json({error: 'Scream already deleted'});
    }
}