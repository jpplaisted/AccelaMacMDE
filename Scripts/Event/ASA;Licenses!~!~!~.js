if (!publicUser && matches(appTypeArray[3],"Application","Renewal")) {

		//  include("INCLUDES_DOC_REQS");  // added to includes file
		cancel = false;
		showMessage = false;
		var showList = false;
		var addConditions = true;
		var addTableRows = false;
		var tableName = "REQUIRED DOCUMENT LIST";
		var conditionTable = new Array();
		var r = getRequiredDocuments();
		if (r.length > 0) {
			for (var x in r) {
			
				var conditionType = "License Required Documents";
				var dr = r[x];

				if (dr) {
					ccr = aa.capCondition.getStandardConditions(conditionType, dr).getOutput();
					}

				if (dr && ccr.length > 0 && showList) {
					comment("<LI><span>" + dr + "</span>: " + ccr[0].getPublicDisplayMessage() + "</LI>");
					}

				if (dr && ccr.length > 0 && !appHasCondition(conditionType, null, dr, null) && addConditions) {
					addStdCondition(conditionType,dr);
					}	

				if (dr && ccr.length > 0 && addTableRows) {
					row = new Array();
					row["Document Type"] = new asiTableValObj("Document Type",dr,"Y");
					row["How Submitted"]=new asiTableValObj("How Submitted","","N");
					row["Comments"] = new asiTableValObj("Comments","","N");
					conditionTable.push(row);
					asit = cap.getAppSpecificTableGroupModel();
				}
			}
		}
	}

if (matches(appTypeArray[3],"Application","Permit","Renewal")) {
	if (!publicUser) {
		var appConObj = getContactObj(capId,"Applicant");
		if (!appConObj.hasPublicUser())
			appConObj.sendCreateAndLinkNotification();
	}
}