# Google Ads - Account and MCC Level Status Code Checker Scripts
Script for Google Ads checking status codes for landing pages, and collating them in a Google Sheet as well as sending emails to warn about non-200 pages.

# How to install these scripts in Google Ads:

Account Level
1. Select an active Google Ads account
2. Go to Tools > Bulk Actions > Scripts
3. Add a new script
4. Give it a name (e.g: "Status Code Checker")
5. Copy the entire content of the account level JavaScript file hosted in this github repository and paste it in your newly created Google Ads Script (replacing the 3 lines of code already present by default)
6. Hit "save" and "preview" to verify the changes that it would apply to your bid modifiers.
7. Hit "Run" to apply changes to your Google Ads account

MCC Level
1. Select your MCC account
2. Go to Tools > Bulk Actions > Scripts
3. Add a new script
4. Give it a name (e.g: "Status Code Checker")
5. Copy the entire content of the MCC level JavaScript file hosted in this github repository and paste it in your newly created Google Ads Script (replacing the 3 lines of code already present by default)
6. Hit "save" and "preview" to verify the changes that it would apply to your bid modifiers.
7. Hit "Run" to apply changes to your Google Ads account

# How to use these scripts:

At the top of each script are 1 or 2 editable parameters depending on the script (Account or MCC level): 

- RECIPIENTS: input one or multiple email addresses here. Those addresses will receive a notification every time the script runs and find a non-200 status code in a Google Ads account. They are also used to share access to the accompanying Google Sheet
- ACCOUNTS: MCC script only, add the Google Ads accounts that you would like the script to audit.
- SHEET_NAME: MCC script only, input the name you would like the spreadsheet to have.
- SEND_EMAIL: MCC script only, 'YES' to send an email to all recipients to warn you about non-200 pages or 'NO' to disable that function.

# How does it work?

The script retrieves pages using the Final URL Report from the Google Ads API and checks status codes for each of them. If it finds non-200 status codes, it will put it in a Google Sheet.

The Google sheet is automatically created. If it exist already (when the script has been run before) it will re-use the existing Google Sheet.

The script and accompanying spreahdsheet do not keep historical data. Previous data will be erased every time the script runs.

More information and notes can be found in the script comments.
