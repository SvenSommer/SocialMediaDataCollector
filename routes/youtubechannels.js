var express     = require("express");
var router      = express.Router();
var YoutubeChannel   = require("../models/youtubechannel");
var Crawler     = require("crawler");
var moment      = require('moment');
const path      = require('path');
var fs          = require('fs');



//INDEX - show all subreddits
router.get("/", function(req,res){
    YoutubeChannel.find().exec(function(err, youtubechannels){
        if(err){
            console.log(err);
        }
    res.render("youtubechannels/index", {youtubechannels: youtubechannels});
    });
});

//CREATE - add new subreddit to DB
router.post("/", function(req,res){
    YoutubeChannel.create(req.body.youtubechannel, function(err, newYoutubechannel){
        if(err){
            console.log(err);
        } else {
            parseHTML(newYoutubechannel,res,req );
        }
    });
    
});

//NEW - show form to create Event
router.get("/new", function(req, res) {
   res.render("youtubechannels/new"); 
});

//REFRESH - edit an existing Event
router.get("/:id/refresh", function(req, res) {
    YoutubeChannel.findById(req.params.id, function(err, foundYoutubechannel){
         if(err){
            console.log(err);
        } else {
            parseHTML(foundYoutubechannel,res, req);
        }
    });
    
});

//REFRESH - edit an existing Event
router.get("/test", function(req, res) {
    res.render("youtubechannels/temp");

});

//DOWNLOAD - Download data csv
router.get("/:id/download_csv", function(req, res) {
    YoutubeChannel.findById(req.params.id, function(err, foundYoutubechannel){
          if(err){
            console.log(err);
        } else {
            console.log("DOWNLOAD_ENABLED:" + process.env.DOWNLOAD_ENABLED);
            if (process.env.DOWNLOAD_ENABLED == "true") {
                writeFile2Download("Youtube_" + foundYoutubechannel.title.split(" ")[0].replace("/r/","") + "_Data.txt",
                buildFileCSV(mergeData(foundYoutubechannel)), 
                res);
            } else {
                var filetext = buildFileCSV(mergeData(foundYoutubechannel));
                res.render("youtubechannels/download", {filetext: filetext});
           }
        }
    });
});

router.get("/:id/download_json", function(req, res) {
    YoutubeChannel.findById(req.params.id, function(err, foundSubreddit){
          if(err){
            console.log(err);
        } else {
            console.log("DOWNLOAD_ENABLED:" + process.env.DOWNLOAD_ENABLED);
           if (process.env.DOWNLOAD_ENABLED == "true") {
                writeFile2Download("Subreddit_" + foundSubreddit.title.split(" ")[0].replace("/r/","") + "_SubscriberData.json",
                buildFileJSON(mergeData(foundSubreddit)), 
                res);
           } else {
                var filetext = buildFileJSON(mergeData(foundSubreddit));
                res.render("subreddits/download", {filetext: filetext});
           }
        }
    });
});

function writeFile2Download(filename,filetext,res){
    var filepath = path.resolve(".")+'/files/'+filename;
    console.log("Starting writing "+ filepath + "...");
    fs.writeFile(filepath, filetext, function(err) {
        if(err) {
            console.log("error while writing: " + err);
            return console.log(err);
        }
        console.log("Done File written: " + filepath);
        res.download(filepath);
        console.log(filepath + " downloaded");
    });  
}

function buildFileCSV(resultMatrix){
    
    var filetext = "Date, TotalSubscribers, SubscriberGrowth, TotalViews, DailyViews\r\n";
        resultMatrix.forEach(function(row){
            filetext += moment(row.date).format('DD.MM.YYYY') + ", " + row.totalSubscribers + ", " + row.subscriberGrowth + ", " + row.totalViews + ", " + row.dailyViews + "\r\n";
        });
    console.log("Done csv-File build!");    
    return filetext;
}

function buildFileJSON(resultMatrix){
    var filetext = JSON.stringify(resultMatrix);
    console.log("Done json-File build!");
    return filetext;
}

   
function mergeData(youtubechannel){
    var firstDate = new Date(youtubechannel.totalSubscribers[0].date);
    var startDate =  firstDate;
    var endDate = new Date(new Date().setDate(new Date().getDate()-1)); //Yesterday
    var resultMatrix = [];
   
    //POINTER
    var pTotalSubscriber = 0, pSubscriberGrowth= 0, pTotalViews = 0, pDailyViews = 0;

    for (var d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
       //row init
        var row = { date: Date, totalSubscribers: String, subscriberGrowth:  String, rank: String };
        
        row.date = new Date(d);
        
        var rTotalSubscriber = getNextMatch(d,pTotalSubscriber,youtubechannel.totalSubscribers);
        row.totalSubscribers = rTotalSubscriber.rvalue;
        pTotalSubscriber = rTotalSubscriber.pointer;

        var rSubscriberGrowth = getNextMatch(d,pSubscriberGrowth,youtubechannel.subscriberGrowth);
        row.subscriberGrowth = rSubscriberGrowth.rvalue;
        pSubscriberGrowth = rSubscriberGrowth.pointer;
  
        var rTotalViews = getNextMatch(d,pTotalViews,youtubechannel.totalViews);
        row.totalViews = rTotalViews.rvalue;
        pTotalViews = rTotalViews.pointer;
       
        var rDailyViews = getNextMatch(d,pDailyViews,youtubechannel.dailyViews);
        row.dailyViews = rDailyViews.rvalue;
        pDailyViews = rDailyViews.pointer;
     
        resultMatrix.push(row);
    }
    console.log("Done" + youtubechannel.title + " merged!");
    return resultMatrix;
}


function getNextMatch(currentDate, pointer, obj){
    var rvalue = "-";
    for (var i = pointer; i < obj.length; i++) {
        if (obj[i].date.getTime() > new Date(currentDate).getTime()) {
            break; 
        } else if (obj[i].date.getTime() === new Date(currentDate).getTime()) {
            rvalue = obj[i].value;
            if (i+1 < obj.length) {
                while(obj[i+1].date.getTime() <= obj[i].date.getTime()){
                    pointer++;
                    i++;
                }
            }
            pointer++;
            break; 
        } 
    }
    return {rvalue : rvalue,
            pointer : pointer};
}

function parseHTML(youtubechannel,res, req){
    console.log("Adding youtubechannel" + youtubechannel.title + "to parsing queue");
    var url = (youtubechannel.url+ "/monthly").replace("youtube.com",process.env.DATABASE_YOUTUBE);
   // var url = "https://socialmediastatisitccollector-svensomer.c9users.io/youtubechannels/test";
    console.log("Looking for " + url);
    
    var success = c.queue({
        uri:url,
        youtubechannel:youtubechannel,
        sres : res,
        req : req
    });
    
    console.log("sucess: " + success);
    

}

var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
        
            var body = $("body").text();
            var title = $("title").text();
            console.log("title: "+ title);
            if(res.options.youtubechannel.htmlbody.length>1) {
                console.log("Found in Formbody something!");
                body = res.options.youtubechannel.htmlbody;
                getTitle(res.options.youtubechannel,body);
                getTotalSubscribers(res.options.youtubechannel,body);
                getSubscriberGrowth(res.options.youtubechannel,body);
                getTotalViews(res.options.youtubechannel,body);
                getDailyViews(res.options.youtubechannel,body);
                res.options.sres.redirect('/youtubechannels');
            } else if (title != "Attention Required! | Cloudflare") {
                res.options.youtubechannel.title = title;
                getTotalSubscribers(res.options.youtubechannel,body);
                getSubscriberGrowth(res.options.youtubechannel,body);
                getTotalViews(res.options.youtubechannel,body);
                getDailyViews(res.options.youtubechannel,body);
                res.options.sres.redirect('/youtubechannels');
            }  else {
                res.options.req.flash("error","Capta Error! Please Provide HTML Body from view-source:" + res.options.uri + "");
                res.options.sres.redirect("back");
                console.log("Capta Error!");
                return false;
                
            }
            
            
        }
        
        done();
        return true;
    }
});

function getTitle(youtubechannel,body) {
  //  var dataPararaph = body.match(/<img\sid=.YouTubeUserTopInfoAvatar.\ssrc=.*\salt=.*/g);
    var dataPararaph = body.match(/Total Views Per Month for.*\'/);
    console.log("dataPararaph: "+ dataPararaph);
    if(dataPararaph) {
        youtubechannel.title = dataPararaph[0].replace("Total Views Per Month for ","").replace(" '", "");
        
        youtubechannel.save();
    } else {
        console.log("Regex failed for getTitle");
    }
}

function getTotalSubscribers(youtubechannel,body) {
    var dataPararaph = body.match(/Date,Total Subs.*\d{4}-\d{2}-\d{2},\d{1,10}/g);
    if(dataPararaph) {
        youtubechannel.totalSubscribers = [];
        dataPararaph.toString().match(/\d{4}-\d{2}-\d{2},\d{1,10}/g).forEach(function(subscriberline){
            try {
                var r = subscriberline.split(",");
                var obj = JSON.parse('{"date":"' + r[0] + '","value": "' + r[1] + '"}');
                youtubechannel.totalSubscribers.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        youtubechannel.save();
    } else {
        console.log("Regex failed for getTotalSubscribers");
    }
}

function getSubscriberGrowth(youtubechannel,body) {
    var dataPararaph = body.match(/Date,Daily Subs.*\d{4}-\d{2}-\d{2},\d{1,10}/g);
    if(dataPararaph) {
        youtubechannel.subscriberGrowth = [];
        dataPararaph.toString().match(/\d{4}-\d{2}-\d{2},\d{1,10}/g).forEach(function(subscriberline){
            try {
                var r = subscriberline.split(",");
                var obj = JSON.parse('{"date":"' + r[0] + '","value": "' + r[1] + '"}');
                youtubechannel.subscriberGrowth.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        youtubechannel.save();
    } else {
        console.log("Regex failed for getSubscriberGrowth");
    }
}

function getTotalViews(youtubechannel,body) {
    var dataPararaph = body.match(/Date,Total Views.*\d{4}-\d{2}-\d{2},\d{1,10}/g);
    if(dataPararaph) {
        youtubechannel.totalViews = [];
        dataPararaph.toString().match(/\d{4}-\d{2}-\d{2},\d{1,10}/g).forEach(function(line){
            try {
                var r = line.split(",");
                var obj = JSON.parse('{"date":"' + r[0] + '","value": "' + r[1] + '"}');
                youtubechannel.totalViews.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        youtubechannel.save();
    } else {
        console.log("Regex failed for getTotalViews");
    }
}

function getDailyViews(youtubechannel,body) {
    var dataPararaph = body.match(/Date,Daily Views.*\d{4}-\d{2}-\d{2},\d{1,10}/g);
    if(dataPararaph) {
        youtubechannel.dailyViews = [];
        dataPararaph.toString().match(/\d{4}-\d{2}-\d{2},\d{1,10}/g).forEach(function(line){
            try {
                var r = line.split(",");
                var obj = JSON.parse('{"date":"' + r[0] + '","value": "' + r[1] + '"}');
                youtubechannel.dailyViews.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        youtubechannel.save();
    } else {
        console.log("Regex failed for getDailyViews");
    }
}


    
module.exports = router;