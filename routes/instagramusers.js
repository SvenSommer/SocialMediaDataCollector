var express     = require("express");
var router      = express.Router();
var Subreddit   = require("../models/subreddit");
var Crawler     = require("crawler");
var moment      = require('moment');
const path      = require('path');
var fs          = require('fs');



//INDEX - show all subreddits
router.get("/", function(req,res){
    Subreddit.find().exec(function(err, subreddits){
        if(err){
            console.log(err);
        }
    res.render("subreddits/index", {subreddits: subreddits});
    });
});

//CREATE - add new subreddit to DB
router.post("/", function(req,res){
    Subreddit.create(req.body.subreddit, function(err, newSubreddit){
        if(err){
            console.log(err);
        } else {
            parseHTML(newSubreddit,res);
        }
    });
    
});

//NEW - show form to create Event
router.get("/new", function(req, res) {
   res.render("subreddits/new"); 
});

//REFRESH - edit an existing Event
router.get("/:id/refresh", function(req, res) {
    Subreddit.findById(req.params.id, function(err, foundSubreddit){
         if(err){
            console.log(err);
        } else {
            parseHTML(foundSubreddit,res);
        }
    });
    
});

//DOWNLOAD - Download data csv
router.get("/:id/download_csv", function(req, res) {
    Subreddit.findById(req.params.id, function(err, foundSubreddit){
          if(err){
            console.log(err);
        } else {
            console.log("DOWNLOAD_ENABLED:" + process.env.DOWNLOAD_ENABLED);
            if (process.env.DOWNLOAD_ENABLED == "true") {
                writeFile2Download("Subreddit_" + foundSubreddit.title.split(" ")[0].replace("/r/","") + "_SubscriberData.csv",
                buildFileCSV(mergeData(foundSubreddit)), 
                res);
            } else {
                var filetext = buildFileCSV(mergeData(foundSubreddit));
                res.render("subreddits/download", {filetext: filetext});
           }
        }
    });
});

router.get("/:id/download_json", function(req, res) {
    Subreddit.findById(req.params.id, function(err, foundSubreddit){
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
    
    var filetext = "Date, TotalSubscribers, SubscriberGrowth, Rank\r\n";
        resultMatrix.forEach(function(row){
            filetext += moment(row.date).format('DD.MM.YYYY') + ", " + row.totalSubscribers + ", " + row.subscriberGrowth + ", " + row.rank + "\r\n";
        });
    console.log("Done csv-File build!");    
    return filetext;
}

function buildFileJSON(resultMatrix){
    var filetext = JSON.stringify(resultMatrix);
    console.log("Done json-File build!");
    return filetext;
}

   
function mergeData(subreddit){
    var firstDate = new Date(subreddit.totalSubscribers[0].date);
    var startDate =  firstDate;
    var endDate = new Date(new Date().setDate(new Date().getDate()-1)); //Yesterday
    var resultMatrix = [];
   
    //POINTER
    var pTotalSubscriber = 0, pSubscriberGrowth= 0, pRank = 0;

    for (var d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
       //row init
        var row = { date: Date, totalSubscribers: String, subscriberGrowth:  String, rank: String };
        
        row.date = new Date(d);
        
        var rTotalSubscriber = getNextMatch(d,pTotalSubscriber,subreddit.totalSubscribers, "TotalSubscribers");
        row.totalSubscribers = rTotalSubscriber.rvalue;
        pTotalSubscriber = rTotalSubscriber.pointer;

        var rSubscriberGrowth = getNextMatch(d,pSubscriberGrowth,subreddit.subscriberGrowth, "SubscriberGrowth");
        row.subscriberGrowth = rSubscriberGrowth.rvalue;
        pSubscriberGrowth = rSubscriberGrowth.pointer;
  
        var rRank = getNextMatch(d,pRank,subreddit.rank, "Rank");
        row.rank = rRank.rvalue;
        pRank = rRank.pointer;
     
        resultMatrix.push(row);
    }
    console.log("Done" + subreddit.title + " merged!");
    return resultMatrix;
}


function getNextMatch(currentDate, pointer, obj, objString){
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

function parseHTML(subreddit,res){
    c.queue({
        uri:subreddit.url.replace("reddit.com/",process.env.DATABASE_REDDIT),
        subreddit:subreddit,
        sres : res
    });

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
            console.log("Parsed: " + $("title").text());
            res.options.subreddit.title = $("title").text().replace(" metrics","");
        
            getSubscriberGrowth(res.options.subreddit,$("body").text());
            getTotalSubscribers(res.options.subreddit,$("body").text());
            getRank(res.options.subreddit,$("body").text());
            res.options.sres.redirect('/subreddits');
        }
        done();
    }
});

function getSubscriberGrowth(subreddit,body) {
    var dataPararaph = body.match(/element: 'subscriber-growth',[\r\n]\s+data: \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g);
    if(dataPararaph) {
        subreddit.subscriberGrowth = [];
        dataPararaph.toString().match(/{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g).forEach(function(subscriberline){
            try {
                var obj = JSON.parse(subscriberline.replace('a','"value"').replace('y','"date"').replace("'",'"').replace("'",'"'));
                subreddit.subscriberGrowth.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        subreddit.save();
    } else {
        console.log("Regex failed for getSubscriberGrowth");
    }
}

function getTotalSubscribers(subreddit,body) {
    var dataPararaph = body.match(/element: 'total-subscribers',[\r\n]\s+data: \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g);
    if(dataPararaph) {
        subreddit.totalSubscribers = [];
        dataPararaph.toString().match(/{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g).forEach(function(subscriberline){
            try {
                var obj = JSON.parse(subscriberline.replace('a','"value"').replace('y','"date"').replace("'",'"').replace("'",'"'));
                subreddit.totalSubscribers.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        subreddit.save();
    } else {
        console.log("Regex failed for getTotalSubscribers");
    }
}

function getRank(subreddit,body) {
    var dataPararaph = body.match(/var rankData = \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g);
    if(dataPararaph) {
        subreddit.rank = [];
        dataPararaph.toString().match( /{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g).forEach(function(rankline){
            try {
                var obj = JSON.parse(rankline.replace('a','"value"').replace('y','"date"').replace("'",'"').replace("'",'"'));
                subreddit.rank.push(obj);
            } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        subreddit.save();
    } else {
        console.log("Regex failed for getRank");
    }
}

    
module.exports = router;