/*------------------------------------------------------------------------------------------------------/
| Program: License Professional Upload 
|
| Version 1.0 - Base Version. 
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START: USER CONFIGURABLE PARAMETERS
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var debugText = "";
var message =	"";									// Message String
var debug = "";										// Debug String
var showDebug = true;
var showMessage = false;
var message = "";
var maxSeconds = 60 * 60;
var br = "<br>";
var recordCount = 0;
var exceptionCount = 0;
var successCount=0;
var addedCount=0;
var updatedCount=0;


/*------------------------------------------------------------------------------------------------------/
| END: USER CONFIGURABLE PARAMETERS
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
wfObjArray = null;

eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));
eval(getScriptText("INCLUDES_CUSTOM"));
//eval(getScriptText("INCLUDES_BATCH"));

// INCLUDES_DATA_LOAD:
//  Custom functions for downloading a document from Accela Automation using GovXML
//	Custom functions for reading from and writing to a flat file using Java.IO
eval(getScriptText("INCLUDES_DATA_LOAD"));  

function getScriptText(vScriptName){
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(),vScriptName,"ADMIN");
	return emseScript.getScriptText() + "";
}

batchJobID = 0;
if (batchJobResult.getSuccess()) {
	batchJobID = batchJobResult.getOutput();
	logDebug("---------------------------------------------------------------");
	logDebug("Batch Job Name: " + batchJobName);
	logDebug("Batch Job ID: " + batchJobID);
}
else
	logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());

var startDate = new Date();
var startJSDate = new Date();
startJSDate.setHours(0, 0, 0, 0);
var timeExpired = false;
var useAppSpecificGroupName = false;
var currentUserID = "ADMIN";
var systemUserObj = aa.person.getUser(currentUserID).getOutput();
var startTime = startDate.getTime(); 		// Start timer

// Flat file upload parameters
//var govXMLURL = "http://192.168.168.62:3080/wireless/GovXMLServlet"; // PROD
var govXMLURL = "http://192.168.168.57:3080/wireless/GovXMLServlet"; // SUPP
var govXMLUser = "ADMIN";
var govXMLPassword = "admin";
var govXMLAgency = "YARMOUTH";
var interfaceFolder = "C:\\Accela_File_Imports\\";
var emailAddress = "jplaisted@accela.com";
var senderEmailAddr = "noreply@yarmouth.ma.us";
var applicationState = null; // GovXML authentication
var docNameTemplate = "LICENSE_PROFESSIONAL_UPLOAD_";
var docNameTemplateSuffix = ".TXT";
var txtDelimiter = "|"; // Used by CSVToArray function
// Set time out to 120 minutes
var timeOutInSeconds = 60*120;

//Licenses/Data Import/License Professional/NA
var recordGroup = "Licenses";
var recordType = "Data Import";
var recordSubType = "License Professional";
var recordCategory = "NA";
var recordStatus = "Ready for Import";

// Batch Job Parameters
/*
var govXMLURL = "" + aa.env.getValue("govXMLURL");
var govXMLUser = "" + aa.env.getValue("govXMLUser");
var govXMLPassword = "" + aa.env.getValue("govXMLPassword");
var govXMLAgency = "" + aa.env.getValue("govXMLAgency");
var interfaceFolder = "" + aa.env.getValue("interfaceFolder");
var emailAddress = "" + aa.env.getValue("emailAddress");
var senderEmailAddr = "" + aa.env.getValue("senderEmailAddr");
var applicationState = null; // GovXML authentication
var docNameTemplate = "" + aa.env.getValue("docNameTemplate");
var docNameTemplateSuffix = "" + aa.env.getValue("docNameTemplateSuffix");
var txtDelimiter = "" + aa.env.getValue("txtDelimiter"); // Used by CSVToArray function
// Set time out to 120 minutes
var timeOutInSeconds = 60*120;

//Licenses/Data Import/License Professional/NA
var recordGroup = "" + aa.env.getValue("recordGroup");
var recordType = "" + aa.env.getValue("recordType");
var recordSubType = "" + aa.env.getValue("recordSubType");
var recordCategory = "" + aa.env.getValue("recordCategory");
var recordStatus = "" + aa.env.getValue("recordStatus");
*/

logDebug("Start Time: " + aa.util.formatDate(aa.util.now(),"MM-dd-YYYY hh:mm:ss"));
logDebug("Time Out Period: " + timeOutInSeconds + " seconds.");			
logDebug("Administrator Email: " + emailAddress);
logDebug("Interface Folder: " + interfaceFolder);
logDebug("---------------------------------------------------------------");

// Counters
var capExCount = 0;	
var capExStr = "";	

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

logDebug("---------------------------------------------------------------");
logDebug("Start Process");
logDebug("---------------------------------------------------------------");

mainProcess();

logDebug("---------------------------------------------------------------");
logDebug("***End Process: Elapsed Time : " + elapsed() + " Seconds***");
logDebug("---------------------------------------------------------------");


	var emailContent;
	
emailContent = '';
emailContent += "Processing Results for " + batchJobName + "<br>";
emailContent += "- processing Date: " + aa.util.formatDate(aa.util.now(),"yyyyMMdd hh:mm:ss") + "<br>";
emailContent += "- elapsed time: " + elapsed() + "<br>";
emailContent += "- number of Records processed: "+ recordCount + "<br>";
emailContent += "- number of Contacts Created: "+ successCount + "<br>";
emailContent += "- number of Exceptions found: " + exceptionCount + "<br>";
emailContent += emailText;
email(emailAddress, senderEmailAddr, batchJobName+" Results", emailContent);

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

/** ************************************************************************************** 
*  MAIN PROCESS
*/
function mainProcess() {
	logDebug("***Searching for Records***");
	logDebug("	Search Type: "+ recordGroup + "/" + recordType +"/"+ recordSubType + "/" + recordCategory );
	logDebug("	Search Status: "+ recordStatus);

	var thisRecord;
	var appTypeResult; 	
	var appTypeString;
	var docFileName;
	var exceptionFileName;
	var errorFileContent;

	// Get any issued meter permits
	var capModel = aa.cap.getCapModel().getOutput();

	// Specify the record type to query
	capTypeModel = capModel.getCapType();
	capTypeModel.setGroup(recordGroup);
	capTypeModel.setType(recordType);
	capTypeModel.setSubType(recordSubType);
	capTypeModel.setCategory(recordCategory);
	capModel.setCapType(capTypeModel);
	capModel.setCapStatus(recordStatus);
	
	var recordListResult = aa.cap.getCapIDListByCapModel(capModel);
	var recordList = new Array();
	if (recordListResult.getSuccess()) 
	{ 	recordList = recordListResult.getOutput();
		logDebug("	Records found:" + recordList.length); 
	}
	else
	{ 	
		logDebug( "**ERROR: getting Records by record type: " + recordListResult.getErrorMessage()) ; return null 
	}
	
	
	// loop through search results
	for (rec in recordList)
	{
		
		// check time out 
		//logDebug(" time elapsed(): " + elapsed());
		if (elapsed() > timeOutInSeconds) {
			logDebug("A script time out has caused partial completion of this process. Please re-run. " + elapsed() + " seconds elapsed, " + timeOutInSeconds + " allowed.");
			break;
		}

		thisRecord = aa.cap.getCap(recordList[rec].getCapID()).getOutput();
		capId = thisRecord.getCapID();
		importCapId=capId;
		logDebug("***Processing Record ID:" + capId.getCustomID()+"***");

		var recordDocs = aa.document.getCapDocumentList(capId,currentUserID);
		if (recordDocs.getSuccess())
		{  
			
			docArray = recordDocs.getOutput(); 
			capDocProcStatus = "S";
			errorFileContent = "";			
			
			// Loop through the Document array returned
			for (docIndex in docArray)
			{	
				var documentObject = docArray[docIndex];
				docFileName = documentObject.getFileName();
				logDebug("	Document Found: " + docFileName);
				
				// Verify the file name = LICENSE_PROFESSIONAL_UPLOAD_*.TXT
				if (docFileName.toUpperCase().indexOf(docNameTemplate) != -1  && // docNameTemplate = "LICENSE_PROFESSIONAL_UPLOAD_" from variables declared above
					docFileName.toUpperCase().indexOf(docNameTemplateSuffix) != -1) // docNameTemplateSuffix = ".TXT" from variables declared above
				{ 
					//Create a set to track all records added by this script
					var setCreateDateTime = aa.util.formatDate(aa.util.now(),"MMddyy:hh:mm:ss");
					var addSetId = "LP_ADD_IMPORT_" + setCreateDateTime;
					var addSetName = "LP File Import Added Records " + setCreateDateTime;
					
					//Create a set to track all records updated by this script
					var updateSetId = "LP_UPDATE_IMPORT_" + setCreateDateTime;
					var updateSetName = "LP File Import Updated Records " + setCreateDateTime;

					
					var lpAddSet = new lpSet(addSetId);
					lpAddSet.name = addSetName
					lpAddSet.type = "LP Import";
					lpAddSet.status = "New";
					lpAddSet.comment = "LPs Added via batch script from " + importCapId.getCustomID(); 
					lpAddSet.update();
					
					var lpUpdateSet = new lpSet(updateSetId);
					lpUpdateSet.name = updateSetName
					lpUpdateSet.type = "LP Import";
					lpUpdateSet.status = "New";
					lpUpdateSet.comment = "LPs Updated via batch script from " + importCapId.getCustomID(); 
					lpUpdateSet.update();

					// Download the document using the Accela GovXML API - called in subroutine INCLUDES_DATA_LOAD:downloadDoc()
					// Save file to application server for processing
	
					// Get the document id key required by GovXML
					var docFileKey = documentObject.getFileKey();
					docContent = downloadDoc(capId, docFileKey, true, govXMLURL, govXMLAgency, govXMLUser, govXMLPassword);

					logDebug("	docFileKey: " + docFileKey);
					logDebug("	Document downloaded. Length: " + docContent.length);
					//logDebug("	Document content: " + docContent);
					
					if (docContent.length > 0)
					{   
						// Save the file on the file system
						// If the file already exists, delete it
						var docFileNameUpper = docFileName.toUpperCase();
						docFilePath=interfaceFolder+docFileNameUpper.substring(0,docFileNameUpper.indexOf(docNameTemplateSuffix))+"_"+aa.util.formatDate(aa.util.now(),"yyyyMMddhhmm")+docNameTemplateSuffix;
						
						aa.util.deleteFile(docFilePath);  //delete it if it already exists
						file = aa.util.writeToFile(docContent, docFilePath);
						logDebug("	File saved to the file system: "+ docFilePath);
					
						// Open and process file
						docString = openDocument(docFilePath);
						if (docString)
						{	
							logDebug("***Processing file: " + docFileNameUpper);
							var row = 0;
							successCount=0;
							addedCount=0;
							updatedCount=0;
							exceptionCount=0;
							while (docString.hasNextLine()) 
							{
		
								thisRow = docString.nextLine();
								row += 1;
								//skip first row headers
								if(row==1) 
								{
									logDebug("Skipping headers: " + thisRow);
									continue;
								}
								//logDebug("*** Processing Row [" + row + "]: " + thisRow);
								
								recordCount++;
								thisRowArray = CSVToArray(thisRow,txtDelimiter);

								// Set Array Elements to variables

								srv_prov_code = thisRowArray[0]; // This is not used becuase we are calling aa.getServiceProviderCode() instead.						
								licNum = thisRowArray[1];
								licenseStatus = thisRowArray[2]; //Ignore this variable as it is not set on the LP but on the License Record Expiration Status
								licenseState = thisRowArray[3];
								licenseType = thisRowArray[4];
								businessName = thisRowArray[5];
								licenseIssueDate = thisRowArray[6];
								licenseRenewalDate = thisRowArray[7];
								licenseExpireDate = thisRowArray[8];					
								firstName = thisRowArray[9];
								middleName = thisRowArray[10];
								lastName = thisRowArray[11];
								addressLine1 = thisRowArray[12];
								addressLine2 = thisRowArray[13];							
								city = thisRowArray[14];
								state = thisRowArray[15];
								zip = thisRowArray[16];
								phone1 = thisRowArray[17];
								phone2 = thisRowArray[18];
								fax = thisRowArray[19];
								eMail = thisRowArray[20];
								licComments = thisRowArray[21];
								insuranceCompany = thisRowArray[22];
								insuranceAmount = thisRowArray[23];
								policyNumber = thisRowArray[24];
								insuranceExpireDate = thisRowArray[25];
								businessLicenseNumber = thisRowArray[26];
								businessLicenseExpireDate = thisRowArray[27];		

								if(isEmpty(licNum) || isEmpty(businessName) || isEmpty(licenseType))
								{
									exceptionCount++;

									// add to exceptions file
									errorString = thisRow + ",**ERROR: Missing required values.";
									errorFileContent += errorString + "\r\n";
									try {
									// add to EXCEPTIONS ASIT
									arrValues = new Array(); 
									arrValues["License Number"] = new asiTableValObj("License Number", licNum, "0");
									arrValues["Business Name"] = new asiTableValObj("Business Name", businessName, "0");
									arrValues["License Type"] = new asiTableValObj("License Type", licenseType, "0");
									//arrValues["First Name"] = new asiTableValObj("First Name", firstName, "0");
									//arrValues["Last Name"] = new asiTableValObj("Last Name", lastName, "0");
									//arrValues["Email"] = new asiTableValObj("Email", eMail, "0");
									//arrValues["Phone 1"] = new asiTableValObj("Phone 1", phone1, "0");
									arrValues["Exception"] = new asiTableValObj("Exception", errorString, "0");
									addToASITable("LP UPLOAD EXCEPTIONS", arrValues, importCapId);
									}
									catch(err){
										logDebug("**ERROR** error adding LP Exception to LP UPLOAD EXCEPTIONS ASI Table : " + err.message );
									}
									
									
									continue;

									logDebug(errorString);

								}
								
								// optional 3rd parameter serv_prov_code
								var updating = false;
								var serv_prov_code_4_lp = aa.getServiceProviderCode();
								
								// addressType = one of the contact address types, or null to pull from the standard contact fields.
								var newLic = getRefLicenseProfWithLicType(licNum,licenseType);

								if (newLic) {
									updating = true;
									logDebug("(Batch License Professional Upload) Updating existing Ref Lic Prof : " + licNum);
									}
								else {
									var newLic = aa.licenseScript.createLicenseScriptModel();
									}

								// Populate License Professional Values

								newLic.setAgencyCode(serv_prov_code_4_lp);
								newLic.setStateLicense(licNum);
								newLic.setLicState(licenseState);
								newLic.setLicenseType(licenseType);
								if (!isEmpty(businessName)) newLic.setBusinessName(businessName);
								if (!isEmpty(licenseIssueDate)) newLic.setLicenseIssueDate(aa.date.parseDate(licenseIssueDate));
								if (!isEmpty(licenseRenewalDate)) newLic.setLicenseLastRenewalDate(aa.date.parseDate(licenseRenewalDate));
								if (!isEmpty(licenseExpireDate)) newLic.setLicenseExpirationDate(aa.date.parseDate(licenseExpireDate));
								if (!isEmpty(firstName)) newLic.setContactFirstName(firstName);
								if (!isEmpty(middleName)) newLic.setContactMiddleName(middleName);
								if (!isEmpty(lastName)) newLic.setContactLastName(lastName);
								if (!isEmpty(addressLine1)) newLic.setAddress1(addressLine1);
								if (!isEmpty(addressLine2)) newLic.setAddress2(addressLine2);
								if (!isEmpty(city)) newLic.setCity(city);
								if (!isEmpty(state)) newLic.setState(state);
								if (!isEmpty(zip))newLic.setZip(zip);
								if (!isEmpty(phone1)) newLic.setPhone1(phone1);
								if (!isEmpty(phone2)) newLic.setPhone2(phone2);
								if (!isEmpty(fax)) newLic.setFax(fax);
								if (!isEmpty(eMail)) newLic.setEMailAddress(eMail);
								if (!isEmpty(licComments)) newLic.setComment(licComments);
								if (!isEmpty(insuranceCompany)) newLic.setInsuranceCo(insuranceCompany);
								if (!isEmpty(insuranceAmount)) newLic.setInsuranceAmount(parseFloat(insuranceAmount));
								if (!isEmpty(policyNumber)) newLic.setPolicy(policyNumber);
								if (!isEmpty(insuranceExpireDate)) newLic.setInsuranceExpDate(aa.date.parseDate(insuranceExpireDate));
								if (!isEmpty(businessLicenseNumber)) newLic.setBusinessLicense(businessLicenseNumber);
								if (!isEmpty(businessLicenseExpireDate)) newLic.setBusinessLicExpDate(aa.date.parseDate(businessLicenseExpireDate));
								newLic.setAuditDate(sysDate);
								newLic.setAuditID(currentUserID);
								newLic.setAuditStatus("A");
								
								
								if (updating)
									myResult = aa.licenseScript.editRefLicenseProf(newLic);
								else
									myResult = aa.licenseScript.createRefLicenseProf(newLic);
									
								if (myResult.getSuccess())
									{
									if(updating){
										//logDebug("Successfully updated License No. " + licNum + ", Type: " + licenseType);
										lpUpdateSet.add(licNum,licenseType);
										lpUpdateSet.update();
										updatedCount++
									}
									else{
										//logDebug("Successfully added License No. " + licNum + ", Type: " + licenseType);
										lpAddSet.add(licNum,licenseType);
										lpAddSet.update();
										addedCount++
									}
									successCount++;
									}
								else
									{
									logDebug("**WARNING: can't create ref lic prof: " + myResult.getErrorMessage());
									}

							}
							docString.close;
						}
						docString.close;
						aa.util.deleteFile(docFilePath);  //cleanup the files since they have been uploaded to the record.
					}
				}
				else {
					logDebug("**WARNING: Didn't find file on record like " + docNameTemplate + "***" + docNameTemplateSuffix);
				}
			}
			
			// Update Inspection Upload Record		
			capId = importCapId;			
			if(exceptionCount>0)
			{
				updateTask("Import","Imported with Exceptions","","");
			}
			else
			{
				closeTask("Import","Import Successful","","");
			}
				
			// upload exceptions file if exceptions were present
			if (exceptionCount>0) {
				// Create a file for exceptions:  interfaceFolder\docFileName_exceptions_yyyyMMddhhmm
				var exceptionFileName = "Exceptions_" + docFileNameUpper.substring(0,docFileNameUpper.indexOf(".TXT"))+"_"+aa.util.formatDate(aa.util.now(),"yyyyMMddhhmm")+'.txt';
				aa.util.deleteFile(interfaceFolder+exceptionFileName);
				aa.util.writeToFile(errorFileContent, interfaceFolder+exceptionFileName);
				uploadDoc(importCapId, exceptionFileName, errorFileContent, govXMLURL, govXMLAgency, govXMLUser, govXMLPassword);
				logDebug("Exception file uploaded.");
				aa.util.deleteFile(interfaceFolder+exceptionFileName); // Remove the file after uploading it.
				
			} else {
				logDebug("No Exceptions raised. No file uploaded.");
			}
			
			// update ASI on File Upload record
			editAppSpecific("Date File Uploaded", aa.util.formatDate(aa.util.now(),"MM/dd/yyyy"), importCapId);
			editAppSpecific("Total License Professionals Imported", successCount, importCapId);
			editAppSpecific("Total License Professionals Added", addedCount, importCapId);
			editAppSpecific("Total License Professionals Updated", updatedCount, importCapId);
			editAppSpecific("Total Exceptions", exceptionCount, importCapId);
			editAppSpecific("Added Set Name", addSetName, importCapId);
			editAppSpecific("Updated Set Name", updateSetName, importCapId);

		}
		else
		{
			logDebug("No Documents found on the Record.");
		}
	}
}


/** ************************************************************************************** 
*  checks for undefined or null or empty strings
*/
function isEmpty(pVariable) {
	if (pVariable === undefined || pVariable == null || pVariable == "") {
		return true;
	} else {
		return false;
	}
}

/** ************************************************************************************** 
*  
*/

/** ************************************************************************************** 
*  Print all object properties
*/
function logDebugObject(o) {
	logDebug(' *** logDebugObject: ');
  for (var p in o) {
	  logDebug(': ' + o[p]);
	} 
}

function getRefLicenseProfWithLicType(refstlic,refLicType)
	{
	var refLicObj = null;
	var refLicenseResult = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(),refstlic);
	if (!refLicenseResult.getSuccess())
		{ logDebug("**ERROR retrieving Ref Lic Profs : " + refLicenseResult.getErrorMessage()); return false; }
	else
		{
		var newLicArray = refLicenseResult.getOutput();
		if (!newLicArray) return null;
		for (var thisLic in newLicArray)
			if (refstlic && newLicArray[thisLic] && refstlic.toUpperCase().equals(newLicArray[thisLic].getStateLicense().toUpperCase()) && refLicType.toUpperCase().equals(newLicArray[thisLic].getLicenseType().toUpperCase()))
				refLicObj = newLicArray[thisLic];
		}

	return refLicObj;
	}

function lpSet(desiredSetId)
    {
    this.refresh = function()
        {

        var theSet = aa.set.getSetByPK(this.id).getOutput();
		this.status = theSet.getSetStatus();
        this.setId = theSet.getSetID();
        this.name = theSet.getSetTitle();
        this.comment = theSet.getSetComment();
		this.model = theSet.getSetHeaderModel();
		this.statusComment = theSet.getSetStatusComment();

        var memberResult = aa.set.getLPSetMembersByPK(this.id);

        if (!memberResult.getSuccess()) { logDebug("**WARNING** error retrieving set members " + memberResult.getErrorMessage()); }
        else
            {
            this.members = memberResult.getOutput().toArray();
            this.size = this.members.length;
            if (this.members.length > 0) this.empty = false;
            logDebug("lpSet: loaded set " + this.id + " of status " + this.status + " with " + this.size + " records");
            }
        }
        
    this.add = function(addLicNum) 
        {
        var reflicType;
		var addLic;
        if (arguments.length == 2){  
			refLicType = arguments[1]; 
			addLic = getRefLicenseProfWithLicType(addLicNum,refLicType);
		}
		else{
			addLic = getRefLicenseProf(addLicNum);
		}

		try {
		 
        var addResult = aa.set.addLPSetMember(this.id,addLic.licSeqNbr);
		
		if (!addResult.getSuccess()) 
            { 
            logDebug("**WARNING** error removing license from set " + this.id + " : " + addResult.getErrorMessage() );
            }
        else 
            { 
            //logDebug("lpSet: added LP " + addLicNum + " to set " + this.id);
            }
		}
		catch(err){
			logDebug("**ERROR** error adding license to set " + this.id + " : " + err.message );
		}
		
		
		
        }
	
	
    this.remove = function(removeLicNum) 
        {
		try {
		var removeLic = getRefLicenseProf(removeLicNum);
		var removeResult = aa.set.removeSetHeadersListByLP(this.id,removeLic.licSeqNbr)
        if (!removeResult.getSuccess()) 
            { 
            logDebug("**WARNING** error removing license from set " + this.id + " : " + removeResult.getErrorMessage() );
            }
        else 
            { 
            logDebug("lpSet: removed license " + removeLicNum + " from set " + this.id);
            }
		}
		catch(err){
			logDebug("**ERROR** error removing license from set " + this.id + " : " + err.message );
		}
        }
    
    this.update = function() 
        {
		var sh = aa.proxyInvoker.newInstance("com.accela.aa.aamain.cap.SetBusiness").getOutput();
		this.model.setSetStatus(this.status)
        this.model.setSetID(this.setId);
        this.model.setSetTitle(this.name);
		this.model.setSetComment(this.comment);
		this.model.setSetStatusComment(this.statusComment);
		this.model.setRecordSetType(this.type);
		this.model.setSetType("LICENSE_PROFESSIONAL") // Options: CAP (Default), LICENSE_PROFESSIONAL, PARCEL, ADDRESS, RANDOMAUDIT
		
		logDebug("lpSet: updating set header information");
		try {
			updateResult = sh.updateSetBySetID(this.model);
			}
		catch(err) {
            logDebug("**WARNING** error updating set header failed " + err.message);
            }

        }
    
    this.id = desiredSetId;
    this.name = desiredSetId;
    this.type = null;
	this.comment = null;
    
	if (arguments.length > 1 && arguments[1]) this.name = arguments[1];
	if (arguments.length > 2 && arguments[2]) this.type = arguments[2];
    if (arguments.length > 3 && arguments[3]) this.comment = arguments[3];
    
    this.size = 0;
    this.empty = true;
    this.members = new Array();
    this.status = "";
	this.statusComment = "";
	this.model = null;
	
	
    var theSetResult = aa.set.getSetByPK(this.id);

    if (theSetResult.getSuccess())
        {
        this.refresh();
        }
        
    else  // add the set
        {
        theSetResult = aa.set.createSet(this.id,this.name,"LICENSE_PROFESSIONAL",this.comment); // Type Options: CAP (Default), LICENSE_PROFESSIONAL, PARCEL, ADDRESS, RANDOMAUDIT
        if (!theSetResult.getSuccess()) 
            {
            logDebug("**WARNING** error creating set " + this.id + " : " + theSetResult.getErrorMessage);
            }
        else
            {
            logDebug("lpSet: Created new set " + this.id + " of type " + this.type); 
            this.refresh();
            }
        }
		
    }

function createSet(setId, setName, setType, setStatus)
{
	var setCreateResult= aa.set.createSet(setId,setName);

	if (setCreateResult.getSuccess())
	{
		// update set type and status
		setScriptResult = aa.set.getSetByPK(setId);
		if (setScriptResult.getSuccess())
		{
			setScript = setScriptResult.getOutput();
			setScript.setRecordSetType(setType);
			setScript.setSetStatus(setStatus);
			updSet = aa.set.updateSetHeader(setScript).getOutput();
		}
		logDebug("Set ID "+setName+" created successfully.");
	}
	else
	{
		logDebug("ERROR: Unable to create new Set ID "+setName+".");
		return false;
	}
}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}