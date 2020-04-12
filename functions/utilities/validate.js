
module.exports = (data,type) => {
    switch (type) {
        case 'isEmpty':
            if (!data.trim().length) return true
            break;
        case 'NotEmail':
            const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if(!data.match(emailRegEx)) return true
        break;
        case 'notPassword':
            if(data.pass != data.pass2) return true
        break;
        default:
            
            break;
    }
    return false;
    }


    