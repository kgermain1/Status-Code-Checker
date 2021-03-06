//Status Code Checker Script
//Written by Kevin Germain for Zenith Global

//Enter one or multiple email addresses here
//format ['xxx@xxx.com'] or ['xxx@xxx.com', 'yyy@yyy.com']
var recipients = [''];

//DO NOT CHANGE ANYTHING BELOW THIS LINE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function main() {
  Logger.log('Getting list of URLs');
  var URLList = getURLList();
  
  Logger.log('Checking status codes');
  var statusCodes = getStatusCodes(URLList);
  
  Logger.log('Filtering status codes');
  var filteredCodes = filterStatusCodes(statusCodes);
  
  Logger.log('Getting additional parameters');
  var extraParams = getExtraParameters(filteredCodes);
  
  Logger.log('Connecting to Google Sheet');
  var spreadsheetURL = createGoogleSheet(extraParams);
  
  Logger.log('Sending Email...');
  sendEmail(spreadsheetURL, extraParams);
  
  Logger.log('Email Sent');

}

//RUNS 1
function getURLList(){
  var URLList = [];
  var query = "SELECT EffectiveFinalUrl FROM FINAL_URL_REPORT";
  var rows = AdsApp.report(query).rows();

  while (rows.hasNext()) {
    var row = rows.next();
    URLList.push(row.EffectiveFinalUrl);
  }
  return URLList;
}

//RUNS 2
function getStatusCodes(URLList){
  var statusCodes = [];
  var HTTP_OPTIONS = {muteHttpExceptions:true, 'followRedirects':false};
  var arrayLength = URLList.length;
  
  for (var i = 0; i < arrayLength; i++) {
    var url = URLList[i];
    var response = UrlFetchApp.fetch(url, HTTP_OPTIONS);
    var statusCode = response.getResponseCode();
    if (statusCode === 301){
      var redirectedURL = response.getHeaders().Location;
      var statusCodeObject = {URL: url, statusCode: statusCode, redirectedURL: redirectedURL};
      statusCodes.push(statusCodeObject);
    }
    else {
      var statusCodeObject = {URL: url, statusCode: statusCode, redirectedURL: ""};
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

//RUNS 3.1
function getExtraParameters(filteredCodes){
  var extraParams = [];
  var arrayLength = filteredCodes.length;
  
  for (var i = 0; i < arrayLength; i++) {
    var URL = filteredCodes[i].URL;
    var query = "SELECT EffectiveFinalUrl, CampaignName, ClickType FROM FINAL_URL_REPORT WHERE CampaignStatus = ENABLED AND EffectiveFinalUrl = '" + URL + "' DURING LAST_30_DAYS";
    var rows = AdsApp.report(query).rows();

    while (rows.hasNext()) {
      var row = rows.next();
      var URLObject = {URL: row.EffectiveFinalUrl, campaignName: row.CampaignName, clickType: row.ClickType, statusCode: filteredCodes[i].statusCode, redirectedURL: filteredCodes[i].redirectedURL};
      extraParams.push(URLObject);
    }
  }
  return extraParams;
}

//RUNS 4
function createGoogleSheet(extraParams){
  var accountName = AdsApp.currentAccount().getName();
  var spreadSheetName = accountName + " Status Code Report";
  var sheetarray = [['URL', 'Campaign', 'Click Type','Status Code', 'Redirected To']];
  var numberRows = extraParams.length + sheetarray.length;
  
  //Checks if spreadsheet exists, if it does, cleans and formats it the right way
  try {
    var file = DriveApp.getFilesByName(spreadSheetName);
    var spreadSheet = SpreadsheetApp.open(file.next());
    var sheet = spreadSheet.getActiveSheet();
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
    var recipientList = recipients.length;
    for (var i = 0; i < recipientList; i++) {
      var recipient = recipients[i];
      DriveApp.getFileById(fileId).addEditor(recipient);
    }
  }

  var spreadsheetUrl = spreadSheet.getUrl();
  var spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  var ss = spreadSheet.getActiveSheet();
  
  //Updates the Google Sheet
  var arrayLength = extraParams.length;
  
  for (var i = 0; i < arrayLength; i++) {
    var URL = extraParams[i].URL;
    var campaign = extraParams[i].campaignName;
    var clickType = extraParams[i].clickType;
    var statusCode = extraParams[i].statusCode;
    var redirectedURL = extraParams[i].redirectedURL;
    sheetarray.push([URL, campaign, clickType, statusCode, redirectedURL]);
  }
  ss.getRange(1, 1, sheetarray.length, sheetarray[0].length).setValues(sheetarray);
  Logger.log(spreadsheetUrl)
  return spreadsheetUrl;
}

//RUNS 5
function sendEmail(spreadsheetURL, extraParams) {
  var accountName = AdsApp.currentAccount().getName();
  var numberRows = extraParams.length;
  //Only sends emails if there are non-200 status codes
  if (numberRows > 0){
    var subjectLine = accountName + ": " + numberRows + " Destination URL Changes Required";
    var emailBody = numberRows +' URLs in your account need changes.\n \nHere is a link to a spreadsheet for you to check out: ' + spreadsheetURL;

    var recipientList = recipients.length;
    for (var i = 0; i < recipientList; i++) {
      var recipient = recipients[i];
      MailApp.sendEmail(recipient, subjectLine, emailBody);
    }
  }
}
 
