const functions = require('firebase-functions');
const {db} = require('./utilities/admin');
const {getAllScreams, addScream, getScream, postScreamComment,likeScream,unlikeScream, deleteScream} = require('./handlers/scream');
const {signUp, singIn, uploadImage, userDetailsUpdate, 
    getUserInformation, getUserDetails,markNotificationsRead } = require('./handlers/users');
const FBauth = require('./utilities/FBauth');
//express how to manage the api and the endpoints, allows us to work with js in the backend
const app = require('express')();
const cors = require('cors');
app.use(cors());


//routers
//scream routers
app.post('/screams',FBauth, addScream);
app.post('/screams/:screamId/comment', FBauth, postScreamComment );
app.get('/screams', getAllScreams);
app.get('/screams/:screamId',getScream);
app.get('/screams/:screamId/like', FBauth, likeScream);
app.get('/screams/:screamId/unlike', FBauth, unlikeScream);
app.delete('/screams/:screamId',FBauth,deleteScream);

//user routers
app.post('/signup', signUp );
app.post('/signin',singIn);
app.post('/user/image',FBauth, uploadImage);
app.post('/user/updateInfo', FBauth, userDetailsUpdate);
app.get('/user', FBauth, getUserInformation);
app.get('/user/:handle',getUserDetails);

//notification routers
//TODO create their own folder
app.post('/notifications',FBauth,markNotificationsRead);



exports.api = functions.https.onRequest(app);

exports.addLikeNotification = functions.firestore.document('likes/{id}')
    .onCreate(async (snap) => {
        // {screamId,userHandle}
        const newValue = snap.data();
        //we need the owner of the post to notify them
        try {
            const screamInfo = await db.doc(`/screams/${newValue.screamId}`).get();
            if (newValue.userHandle !== screamInfo.data().userHandle) {
                await db.doc(`/notifications/${snap.id}`).set(
                    {
                        recipient: screamInfo.data().userHandle,
                        sender : newValue.userHandle,
                        read : false,
                        screamId: newValue.screamId,
                        type: 'like',
                        createdAt: new Date().toISOString()
                    }
                )
            }
        } catch (err) {
            console.log(err);
        }
    });

exports.removeLikeNotification = functions.firestore.document('likes/{id}')
    .onDelete(async (snap) => {
        try {
            await db.doc(`/notifications/${snap.id}`).delete();
        } catch (err) {
        }
    });

exports.addCommentNotification = functions.firestore.document('comments/{id}')
    .onCreate(async (snap) => {
        // {screamId,userHandle}
        const newValue = snap.data();
        //we need the owner of the post to notify them
        try {
            const screamInfo = await db.doc(`/screams/${newValue.screamId}`).get();
            if (newValue.userHandle !== screamInfo.data().userHandle) {
                await db.doc(`/notifications/${snap.id}`).set(
                    {
                        recipient: screamInfo.data().userHandle,
                        sender : newValue.userHandle,
                        read : false,
                        screamId: newValue.screamId,
                        type: 'comment',
                        createdAt: new Date().toISOString()
                    }
                )
            }
        } catch (err) {
            console.log(err);
        }
    });

exports.onScreamDelete = functions.firestore.document('screams/{screamId}')
    .onDelete( async (snap,context) => {
        const screamId = context.params.screamId;
        const BATCH = db.batch();
        
        try {
            //delete comments 
            const comments = await db.collection('comments').where('screamId','==', screamId).get();
            comments.forEach(element => {
                BATCH.delete(db.doc(`/comments/${element.id}`));
            })
            //delete likes
            const likes = await db.collection('likes').where('screamId','==', screamId).get();
            likes.forEach(element => {
                BATCH.delete(db.doc(`/likes/${element.id}`));
            })
            //delete notifications
            const notifications = await db.collection('notifications').where('screamId','==', screamId).get();
            notifications.forEach(element => {
                BATCH.delete(db.doc(`/notifications/${element.id}`));
            })
            await BATCH.commit();
        } catch (error) {
            console.log(error)
        }
    })

exports.onPictureChange = functions.firestore.document('users/{handle}')
    .onUpdate (async (change,context) => {
        const before = change.before.data().imageUrl;
        const after = change.after.data().imageUrl; 
        const handle = context.params.handle;
        const batch = db.batch();

        if (before !== after) {
            try {
                const screams = await db.collection('screams').where('userHandle','==',handle).get();
                screams.forEach( element => {
                    const session =(db.doc(`/screams/${element.id}`));
                    batch.update(session, {imageUrl: after});
                })

                const comments = await db.collection('comments').where('userHandle','==',handle).get();
                comments.forEach( element => {
                    const session =(db.doc(`/comments/${element.id}`));
                    batch.update(session, {imageUrl: after});
                })
                batch.commit();
            } catch (err) {
                console.log(err)
            }
            
        }
    })
