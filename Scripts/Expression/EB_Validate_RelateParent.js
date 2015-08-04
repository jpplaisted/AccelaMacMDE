/*------------------------------------------------------------------------------------------------------/
| SVN $Id:  EB_Check_For_CAP_ID.js   2010-01-05   john.schomp $
| Program : EB_Check_For_CAP_ID.js
|
| Usage   : Expression Builder Script that will validate a Cap ID
|
| Client  : N/A
| Action# : N/A
|
| Notes   : Expression builder script to be used on ASI portlet.  Execute on the CAP ID field
|
/------------------------------------------------------------------------------------------------------*/

var msg = "";
var aa = expression.getScriptRoot();

var licCap = null;

var licObj = expression.getValue("ASI::PET_LIC::Pet License ID");
var thisForm = expression.getValue("ASI::FORM");
var licNum = licObj.value;
var id1=expression.getValue("$$capID1$$").value;
var id2=expression.getValue("$$capID2$$").value;
var id3=expression.getValue("$$capID3$$").value;
var capIDString=expression.getValue("CAP::capModel*altID");
var capId = aa.cap.getCapID(id1,id2,id3).getOutput();

if (licNum) licCap = aa.cap.getCapID(licNum).getOutput();

if (!licCap)
    {
     msg = "Invalid record, please try again";
     licObj.value = "";
     thisForm.blockSubmit=true;
    }
else
    {
	addParent(licCap,capId);
    msg = aa.cap.getCapDetail(licCap).getOutput().getCapDetailModel().getShortNotes();
    msg += "  " ;
    msg += aa.cap.getCap(licCap).getOutput().getSpecialText();
	
    thisForm.blockSubmit=false;
    }

licObj.message = msg;
expression.setReturn(licObj);
expression.setReturn(thisForm);

function addParent(parentAppNum,vCapId)
//
// adds the current application to the parent
//
	{
	if (typeof(parentAppNum) != "object")  // is this one an object or string?
		{
		var getCapResult = aa.cap.getCapID(parentAppNum);
		if (getCapResult.getSuccess())
			{
			var parentId = getCapResult.getOutput();
			}
		else
			{ logDebug( "**ERROR: getting parent cap id (" + parentAppNum + "): " + getCapResult.getErrorMessage());
				return false;}
		}
	else
		{
		parentId = parentAppNum;
		}

	var linkResult = aa.cap.createAppHierarchy(parentId, vCapId);
	if (linkResult.getSuccess())
		logDebug("Successfully linked to Parent Application : " + parentAppNum);
	else
		logDebug( "**ERROR: linking to parent application parent cap id (" + parentAppNum + "): " + linkResult.getErrorMessage());

	}
