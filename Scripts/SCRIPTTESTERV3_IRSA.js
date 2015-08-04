/*------------------------------------------------------------------------------------------------------/
| InspectionSubmitResultAfter Script Test Parameters - Modify as needed
/------------------------------------------------------------------------------------------------------*/
var myCapId = "ENFOR-2012-000043"; 			// AltID of the Record to test
var inspId = 323;							// Inspection to test
inspResult = "In Violation";				// Inspection Result
var myUserId = "JPLAISTED";
var documentOnly = false;
var controlString = "InspectionResultSubmitAfter"; 	// Standard Choice Starting Point
var preExecute = "PreExecuteForAfterEvents"  	// Standard choice to execute first (for globals, etc) (PreExecuteForAfterEvent or PreExecuteForBeforeEvents)


/*------------------------------------------------------------------------------------------------------/
| Set Required Environment Variables Value
/------------------------------------------------------------------------------------------------------*/
var tmpID = aa.cap.getCapID(myCapId).getOutput();
if(tmpID != null){
	aa.env.setValue("PermitId1",tmpID.getID1());
	aa.env.setValue("PermitId2",tmpID.getID2());
	aa.env.setValue("PermitId3",tmpID.getID3());
}
aa.env.setValue("CurrentUserID",myUserId);


/*------------------------------------------------------------------------------------------------------/
| Log Globals and Add Includes
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 3.0

eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));
eval(getScriptText("INCLUDES_ACCELA_GLOBALS"));
eval(getScriptText("INCLUDES_CUSTOM"));


	inspObj = aa.inspection.getInspection(capId,inspId).getOutput();  // current inspection object
	//inspResult = inspObj.getInspection().getInspectionStatus(); //Un-comment if you intend to use the result that already exists
	inspType = inspObj.getInspection().getInspectionType();
	inspGroup = inspObj.getInspection().getInspectionGroup();
	inspResultComment = inspObj.getInspection().getResultComment();
	inspComment = inspResultComment; // consistency between events
	inspResultDate = inspObj.getInspectionStatusDate().getMonth() + "/" + inspObj.getInspectionStatusDate().getDayOfMonth() + "/" + inspObj.getInspectionStatusDate().getYear();

	if (inspObj.getScheduledDate())
		inspSchedDate = inspObj.getScheduledDate().getMonth() + "/" + inspObj.getScheduledDate().getDayOfMonth() + "/" + inspObj.getScheduledDate().getYear();
	else
		inspSchedDate = null;

    inspTotalTime = inspObj.getTimeTotal();
	logDebug("inspId " + inspId);
	logDebug("inspResult = " + inspResult);
	logDebug("inspResultComment = " + inspResultComment);
	logDebug("inspComment = " + inspComment);
	logDebug("inspResultDate = " + inspResultDate);
	logDebug("inspGroup = " + inspGroup);
	logDebug("inspType = " + inspType);
	logDebug("inspSchedDate = " + inspSchedDate);
    logDebug("inspTotalTime = " + inspTotalTime);

if (documentOnly) {
	doStandardChoiceActions(controlString,false,0);
	aa.env.setValue("ScriptReturnCode", "0");
	aa.env.setValue("ScriptReturnMessage", "Documentation Successful.  No actions executed.");
	aa.abortScript();
	}
	
function getScriptText(vScriptName){
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(),vScriptName,"ADMIN");
	return emseScript.getScriptText() + "";	
}

/*------------------------------------------------------------------------------------------------------/
| Execute Script Controls
/------------------------------------------------------------------------------------------------------*/

if (preExecute.length) doStandardChoiceActions(preExecute,true,0); 	// run Pre-execution code

logGlobals(AInfo);

doStandardChoiceActions(controlString,true,0);

showMessage=true;
showDebug=3;

//
// Check for invoicing of fees
//
if (feeSeqList.length)
	{
	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
	if (invoiceResult.getSuccess())
		logMessage("Invoicing assessed fee items is successful.");
	else
		logMessage("**ERROR: Invoicing the fee items assessed to app # " + capIDString + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
	}

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

if (debug.indexOf("**ERROR") > 0)
	{
	aa.env.setValue("ScriptReturnCode", "1");
	aa.env.setValue("ScriptReturnMessage", debug);
	}
else
	{
	aa.env.setValue("ScriptReturnCode", "0");
	if (showMessage) aa.env.setValue("ScriptReturnMessage", message);
	if (showDebug) 	aa.env.setValue("ScriptReturnMessage", debug);
	}
/*------------------------------------------------------------------------------------------------------/
| End test code
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/