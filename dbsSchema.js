let db = {
    users: [
        {
            userId: "I1m0LpeGe1Qj222zsA8CHUmboIk2",
            email: "alexander@hortua.com",
            handle: "wednesday",
            createdAt: "2020-03-24T23:01:29.753Z",
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/socialapp-dcc3c.appspot.com/o/no-name.png?alt=media",
            bio: "Hello my name is Alex",
            website:"https:user.com",
            location: "Vancouver, Canada"
        }
    ],
    screams: [
        {
            userHandle: 'user',
            body: 'This is the scream body',
            createdAt: "2020-03-24T23:01:29.753Z",
            likeCount: 5,
            commentCount: 2,
        }
    ],
    comments : [
        {
            userHandle: 'user',
            screamId: '$#%$#$TE$$',
            body: 'nice to meet you',
            createdAt: "2020-03-24T23:01:29.753Z"
        }
    ],
    notifications: [
        {
            recipient: 'user',
            sender : 'john',
            read : 'true|false',
            screamId: '3ert54t34434',
            type: 'like|comment',
            createdAt: "2020-03-24T23:01:29.753Z"
        }
    ],
    likes : [
        {
            userHandle: 'user',
            screamId: '35525rgdfgd',
            createdAt : "2020...."
        }
    ]
}


const userDetails = {
    //redux data 
    credentials : {
        userId: "I1m0LpeGe1Qj222zsA8CHUmboIk2",
        email: "alexander@hortua.com",
        handle: "wednesday",
        createdAt: "2020-03-24T23:01:29.753Z",
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/socialapp-dcc3c.appspot.com/o/no-name.png?alt=media",
        bio: "Hello my name is Alex",
        website:"https:user.com",
        location: "Vancouver, Canada"
    },
    likes: []
}