//MCC Status Code Checker Script
//Written by Kevin Germain for Zenith Global

//Enter one or multiple email addresses here
//format ['xxx@xxx.com'] or ['xxx@xxx.com', 'yyy@yyy.com']
var RECIPIENTS = [''];

//Enter one or multiple Google Ads accounts to be checked by the script here
//format ['XXX-XXX-XXXX'] or ['XXX-XXX-XXXX', 'YYY-YYY-YYYY']
var ACCOUNTS = ['123-456-7890'];

//Enter the name you would like the spreadsheet to have here
var SHEET_NAME = 'Name Status Code Report';

//'YES' to send an email to all recipients to warn you about non-200 pages or 'NO' to disable that function
var SEND_EMAIL = 'NO';

//DO NOT CHANGE ANYTHING BELOW THIS LINE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function main () {
  Logger.log("Getting Accounts")
  var childAccounts = AdsManagerApp.accounts().withIds(ACCOUNTS).get();
  Logger.log("Accounts retrieved")
  
  while (childAccounts.hasNext()){
    
    var childAccount = childAccounts.next();
    AdsManagerApp.select(childAccount);
    var accountName = AdsApp.currentAccount().getName();
    Logger.log("Running for " + accountName)
    
    Logger.log('Getting list of URLs');
    var URLList = getURLList();

    Logger.log('Checking status codes');
    var statusCodes = getStatusCodes(URLList);

    Logger.log('Filtering status codes');
    var filteredCodes = filterStatusCodes(statusCodes);

    Logger.log('Connecting to Google Sheet');
    var spreadsheetURL = createGoogleSheet(filteredCodes);

    if (SEND_EMAIL === 'YES'){
      Logger.log('Sending Email...');
      sendEmail(spreadsheetURL, filteredCodes);

      Logger.log('Email Sent');
    }
  }
}

//RUNS 1
function getURLList(){
  var URLList = [];
  var query = "SELECT EffectiveFinalUrl, CampaignName, ClickType FROM FINAL_URL_REPORT WHERE CampaignStatus = ENABLED DURING LAST_30_DAYS";

  var rows = AdsApp.report(query).rows();

  while (rows.hasNext()) {
    var row = rows.next();
    var URLObject = {URL: row.EffectiveFinalUrl, campaignName: row.CampaignName, clickType: row.ClickType}
    URLList.push(URLObject);
  }
  return URLList;
}

//RUNS 2
function getStatusCodes(URLList){
  var statusCodes = [];
  var URLListLength = URLList.length;
  
  //Creates the JSON to send to URLFetchApp
  var requests = [];  
  for (var i = 0; i < URLListLength; i++) {
    var requestObject = {'url': URLList[i].URL, 'muteHttpExceptions': true, 'followRedirects':false};
    requests.push(requestObject);
  }
  
  var response = UrlFetchApp.fetchAll(requests);
  
  for (var i = 0; i < URLListLength; i++) {
    var url = requests[i].url;
    var statusCode = response[i].getResponseCode();
    if (statusCode === 301){
      var redirectedURL = response[i].getHeaders().Location;
      var statusCodeObject = {URL: url, campaignName: URLList[i].campaignName, clickType:URLList[i].clickType, statusCode: statusCode, redirectedURL: redirectedURL};
      statusCodes.push(statusCodeObject);
    }
    else {
      var statusCodeObject = {URL: url, campaignName: URLList[i].campaignName, clickType:URLList[i].clickType, statusCode: statusCode, redirectedURL: ""};
      statusCodes.push(statusCodeObject);
    }
  }
  return statusCodes;
}

//RUNS 3
function filterStatusCodes(statusCodes){
  var badCodes = [301, 302, 404, 410, 500, 502, 503];
  var filteredCodes = [];   
  var arrayLength = statusCodes.length;
  
  badCodes.forEach(function(badStatusCode){
    for (var i = 0; i < arrayLength; i++) {
      if (statusCodes[i].statusCode === badStatusCode){
        filteredCodes.push(statusCodes[i]);
      }
    }
  });
  return filteredCodes;
}

//RUNS 4
function createGoogleSheet(filteredCodes){
  var accountName = AdsApp.currentAccount().getName();
  var spreadSheetName = SHEET_NAME;
  var sheetarray = [['URL', 'Campaign', 'Click Type','Status Code', 'Redirected To']];
  var numberRows = filteredCodes.length + sheetarray.length;
  
  //Checks if spreadsheet exists, if it does, cleans and formats it the right way
  try {
    var file = DriveApp.getFilesByName(spreadSheetName);
    var spreadSheet = SpreadsheetApp.open(file.next());
    var sheet = spreadSheet.getSheetByName(accountName);
      
    if (sheet === null) {
      var sheet = spreadSheet.insertSheet(accountName);
      Logger.log("New Sheet Added")
    }
    var lastColumn = (sheet.getMaxColumns() - 1);
    var lastRow = (sheet.getMaxRows() - 1);

    sheet.deleteRows(1, lastRow);
    sheet.deleteColumns(1, lastColumn);
  }
  
  //If the spreadsheet does not exist
  catch(err) {
    Logger.log("Spreadsheet does not exist, creating it...")
    var spreadSheet = SpreadsheetApp.create(spreadSheetName, numberRows, sheetarray[0].length);

    //Share spreadsheet with relevant recipients
    var fileId = spreadSheet.getId();
    var recipientList = RECIPIENTS.length;
    for (var i = 0; i < recipientList; i++) {
      var recipient = RECIPIENTS[i];
      DriveApp.getFileById(fileId).addEditor(recipient);
    }
    
    var sheet = spreadSheet.getActiveSheet().setName(accountName);
  }

  var spreadsheetUrl = spreadSheet.getUrl();
  
  //Updates the Google Sheet
  var arrayLength = filteredCodes.length;
  
  for (var i = 0; i < arrayLength; i++) {
    var URL = filteredCodes[i].URL;
    var campaign = filteredCodes[i].campaignName;
    var clickType = filteredCodes[i].clickType;
    var statusCode = filteredCodes[i].statusCode;
    var redirectedURL = filteredCodes[i].redirectedURL;
    sheetarray.push([URL, campaign, clickType, statusCode, redirectedURL]);
  }

  sheet.getRange(1, 1, sheetarray.length, sheetarray[0].length).setValues(sheetarray);
  Logger.log(spreadsheetUrl)
  return spreadsheetUrl;
}

//RUNS 5
function sendEmail(spreadsheetURL, filteredCodes) {
  var accountName = AdsApp.currentAccount().getName();
  var numberRows = filteredCodes.length;
  //Only sends emails if there are non-200 status codes
  if (numberRows > 0){
    var subjectLine = accountName + ": " + numberRows + " Destination URL Changes Required";
    var emailBody = numberRows +' URLs in your account need changes.\n \nHere is a link to a spreadsheet for you to check out: ' + spreadsheetURL;

    var recipientList = RECIPIENTS.length;
    for (var i = 0; i < recipientList; i++) {
      var recipient = RECIPIENTS[i];
      MailApp.sendEmail(recipient, subjectLine, emailBody);
    }
  }
}
 
