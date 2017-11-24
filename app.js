var express             = require("express"),
    app                 = express(),
    methodOverride      = require("method-override"),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    flash               = require("connect-flash"),
    passport            = require("passport"),
    moment              = require('moment'),
    helmet              = require('helmet');

    
// killall mongod ; cd ; ./mongod --repair ; cd data ; rm -rf mongod.lock ; cd ; ./mongod

app.use(helmet());
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true,limit: '50mb'}));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

if (!process.env.DATABASEURL) {
    console.log("No DATABASEURL specified. Continuing with Default.");
}

if (!process.env.DATABASE_REDDIT) {
    console.log("No DATABASE_REDDIT specified!!");
}

if (!process.env.DOWNLOAD_ENABLED) {
    console.log("No DOWNLOAD_ENABLED option specified");
}



var indexRoutes          = require("./routes/index"),
 subredditRoutes      = require("./routes/subreddits"),
 youtubechannelRoutes = require("./routes/youtubechannels"),
 twitchuserRoutes         = require("./routes/twitchusers"),
 twitteruserRoutes        = require("./routes/twitterusers"),
 instagramuserRoutes      = require("./routes/instagramusers");

//PASSPOORT CINFIGURATION
app.use(require("express-session")({
    secret: process.env.PASSWORDSECRET,
    resave: false,
    saveUninitialized: false
}));
    

//APP Config
app.locals.moment = moment;
var url = process.env.DATABASEURL || "mongodb://localhost/socialmediadata";
mongoose.connect(url, {useMongoClient: true});
 
app.use(passport.initialize());
app.use(passport.session()); 
 
app.use(function(req, res, next){
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
}); 
  
app.use("/", indexRoutes);  
app.use("/subreddits", subredditRoutes);  
app.use("/youtubechannels", youtubechannelRoutes);  
app.use("/twitchusers", twitchuserRoutes);  
app.use("/twitterusers", twitteruserRoutes);  
app.use("/instagramusers", instagramuserRoutes);  
    
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server has started!");
});