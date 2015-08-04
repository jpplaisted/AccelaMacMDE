/*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_CUSTOM.js
| Event   : N/A
|
| Usage   : Custom Script Include.  Insert custom EMSE Function below and they will be 
	    available to all master scripts
|
| Notes   : createRefLicProf - override to default the state if one is not provided
|
|         : createRefContactsFromCapContactsAndLink - testing new ability to link public users to new ref contacts
/------------------------------------------------------------------------------------------------------*/

function createRefLicProf(rlpId,rlpType,pContactType)
	{
	//Creates/updates a reference licensed prof from a Contact
	//06SSP-00074, modified for 06SSP-00238
	var updating = false;
	var capContResult = aa.people.getCapContactByCapID(capId);
	if (capContResult.getSuccess())
		{ conArr = capContResult.getOutput();  }
	else
		{
		logDebug ("**ERROR: getting cap contact: " + capAddResult.getErrorMessage());
		return false;
		}

	if (!conArr.length)
		{
		logDebug ("**WARNING: No contact available");
		return false;
		}


	var newLic = getRefLicenseProf(rlpId)

	if (newLic)
		{
		updating = true;
		logDebug("Updating existing Ref Lic Prof : " + rlpId);
		}
	else
		var newLic = aa.licenseScript.createLicenseScriptModel();

	//get contact record
	if (pContactType==null)
		var cont = conArr[0]; //if no contact type specified, use first contact
	else
		{
		var contFound = false;
		for (yy in conArr)
			{
			if (pContactType.equals(conArr[yy].getCapContactModel().getPeople().getContactType()))
				{
				cont = conArr[yy];
				contFound = true;
				break;
				}
			}
		if (!contFound)
			{
			logDebug ("**WARNING: No Contact found of type: "+pContactType);
			return false;
			}
		}

	peop = cont.getPeople();
	addr = peop.getCompactAddress();

	newLic.setContactFirstName(cont.getFirstName());
	//newLic.setContactMiddleName(cont.getMiddleName());  //method not available
	newLic.setContactLastName(cont.getLastName());
	newLic.setBusinessName(peop.getBusinessName());
	newLic.setAddress1(addr.getAddressLine1());
	newLic.setAddress2(addr.getAddressLine2());
	newLic.setAddress3(addr.getAddressLine3());
	newLic.setCity(addr.getCity());
	newLic.setState(addr.getState());
	newLic.setZip(addr.getZip());
	newLic.setPhone1(peop.getPhone1());
	newLic.setPhone2(peop.getPhone2());
	newLic.setEMailAddress(peop.getEmail());
	newLic.setFax(peop.getFax());

	newLic.setAgencyCode(aa.getServiceProviderCode());
	newLic.setAuditDate(sysDate);
	newLic.setAuditID(currentUserID);
	newLic.setAuditStatus("A");

	if (AInfo["Insurance Co"]) 		newLic.setInsuranceCo(AInfo["Insurance Co"]);
	if (AInfo["Insurance Amount"]) 		newLic.setInsuranceAmount(parseFloat(AInfo["Insurance Amount"]));
	if (AInfo["Insurance Exp Date"]) 	newLic.setInsuranceExpDate(aa.date.parseDate(AInfo["Insurance Exp Date"]));
	if (AInfo["Policy #"]) 			newLic.setPolicy(AInfo["Policy #"]);

	if (AInfo["Business License #"]) 	newLic.setBusinessLicense(AInfo["Business License #"]);
	if (AInfo["Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["Business License Exp Date"]));

	newLic.setLicenseType(rlpType);

	if(addr.getState() != null)
		newLic.setLicState(addr.getState());
	else
		newLic.setLicState("AK"); //default the state if none was provided

	newLic.setStateLicense(rlpId);

	if (updating)
		myResult = aa.licenseScript.editRefLicenseProf(newLic);
	else
		myResult = aa.licenseScript.createRefLicenseProf(newLic);

	if (myResult.getSuccess())
		{
		logDebug("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		logMessage("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		return true;
		}
	else
		{
		logDebug("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		logMessage("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		return false;
		}
	}


function createRefContactsFromCapContactsAndLink(pCapId, contactTypeArray, ignoreAttributeArray, replaceCapContact, overwriteRefContact, refContactExists)
	{

	// contactTypeArray is either null (all), or an array or contact types to process
	//
	// ignoreAttributeArray is either null (none), or an array of attributes to ignore when creating a REF contact
	//
	// replaceCapContact not implemented yet
	//
	// overwriteRefContact -- if true, will refresh linked ref contact with CAP contact data
	//
	// refContactExists is a function for REF contact comparisons.
	//
	// Version 2.0 Update:   This function will now check for the presence of a standard choice "REF_CONTACT_CREATION_RULES". 
	// This setting will determine if the reference contact will be created, as well as the contact type that the reference contact will 
	// be created with.  If this setting is configured, the contactTypeArray parameter will be ignored.   The "Default" in this standard
	// choice determines the default action of all contact types.   Other types can be configured separately.   
	// Each contact type can be set to "I" (create ref as individual), "O" (create ref as organization), 
	// "F" (follow the indiv/org flag on the cap contact), "D" (Do not create a ref contact), and "U" (create ref using transaction contact type).
	
	var standardChoiceForBusinessRules = "REF_CONTACT_CREATION_RULES";
	
	
	var ingoreArray = new Array();
	if (arguments.length > 1) ignoreArray = arguments[1];
	
	var defaultContactFlag = lookup(standardChoiceForBusinessRules,"Default");

	var c = aa.people.getCapContactByCapID(pCapId).getOutput()
	var cCopy = aa.people.getCapContactByCapID(pCapId).getOutput()  // must have two working datasets

	for (var i in c)
	   {
	   var ruleForRefContactType = "U"; // default behavior is create the ref contact using transaction contact type
	   var con = c[i];

	   var p = con.getPeople();
	   
	   var contactFlagForType = lookup(standardChoiceForBusinessRules,p.getContactType());
	   
	   if (!defaultContactFlag && !contactFlagForType) // standard choice not used for rules, check the array passed
	   	{
	   	if (contactTypeArray && !exists(p.getContactType(),contactTypeArray))
			continue;  // not in the contact type list.  Move along.
		}
	
	   if (!contactFlagForType && defaultContactFlag) // explicit contact type not used, use the default
	   	{
	   	ruleForRefContactType = defaultContactFlag;
	   	}
	   
	   if (contactFlagForType) // explicit contact type is indicated
	   	{
	   	ruleForRefContactType = contactFlagForType;
	   	}

	   if (ruleForRefContactType.equals("D"))
	   	continue;
	   	
	   var refContactType = "";
	   
	   switch(ruleForRefContactType)
	   	{
		   case "U":
		     refContactType = p.getContactType();
		     break;
		   case "I":
		     refContactType = "Individual";
		     break;
		   case "O":
		     refContactType = "Organization";
		     break;
		   case "F":
		     if (p.getContactTypeFlag() && p.getContactTypeFlag().equals("organization"))
		     	refContactType = "Organization";
		     else
		     	refContactType = "Individual";
		     break;
		}
	   
	   var refContactNum = con.getCapContactModel().getRefContactNumber();
	   
	   if (refContactNum)  // This is a reference contact.   Let's refresh or overwrite as requested in parms.
	   	{
	   	if (overwriteRefContact)
	   		{
	   		p.setContactSeqNumber(refContactNum);  // set the ref seq# to refresh
	   		p.setContactType(refContactType);
	   		
	   						var a = p.getAttributes();
			
							if (a)
								{
								var ai = a.iterator();
								while (ai.hasNext())
									{
									var xx = ai.next();
									xx.setContactNo(refContactNum);
									}
					}
					
	   		var r = aa.people.editPeopleWithAttribute(p,p.getAttributes());
	   		
			if (!r.getSuccess()) 
				logDebug("WARNING: couldn't refresh reference people : " + r.getErrorMessage()); 
			else
				logDebug("Successfully refreshed ref contact #" + refContactNum + " with CAP contact data"); 
			}
			
	   	if (replaceCapContact)
	   		{
				// To Be Implemented later.   Is there a use case?
			}
			
	   	}
	   	else  // user entered the contact freehand.   Let's create or link to ref contact.
	   	{
			var ccmSeq = p.getContactSeqNumber();

			var existingContact = refContactExists(p);  // Call the custom function to see if the REF contact exists

			var p = cCopy[i].getPeople();  // get a fresh version, had to mangle the first for the search

			if (existingContact)  // we found a match with our custom function.  Use this one.
				{
					refPeopleId = existingContact;
				}
			else  // did not find a match, let's create one
				{

				var a = p.getAttributes();

				if (a)
					{
					//
					// Clear unwanted attributes
					var ai = a.iterator();
					while (ai.hasNext())
						{
						var xx = ai.next();
						if (ignoreAttributeArray && exists(xx.getAttributeName().toUpperCase(),ignoreAttributeArray))
							ai.remove();
						}
					}
				
				p.setContactType(refContactType);
				var r = aa.people.createPeopleWithAttribute(p,a);

				if (!r.getSuccess())
					{logDebug("WARNING: couldn't create reference people : " + r.getErrorMessage()); continue; }

				//
				// createPeople is nice and updates the sequence number to the ref seq
				//

				var p = cCopy[i].getPeople();
				var refPeopleId = p.getContactSeqNumber();

				logDebug("Successfully created reference contact #" + refPeopleId);
				
				// Need to link to an existing public user.
				
			    var getUserResult = aa.publicUser.getPublicUserByEmail(con.getEmail())
			    if (getUserResult.getSuccess() && getUserResult.getOutput()) {
			        var userModel = getUserResult.getOutput();
			        logDebug("createRefContactsFromCapContactsAndLink: Found an existing public user: " + userModel.getUserID());
					
					if (refPeopleId)	{
						logDebug("createRefContactsFromCapContactsAndLink: Linking this public user with new reference contact : " + refPeopleId);
						aa.licenseScript.associateContactWithPublicUser(userModel.getUserSeqNum(), refPeopleId);
						}
					}
				}

			//
			// now that we have the reference Id, we can link back to reference
			//

		    var ccm = aa.people.getCapContactByPK(pCapId,ccmSeq).getOutput().getCapContactModel();

		    ccm.setRefContactNumber(refPeopleId);
		    r = aa.people.editCapContact(ccm);

		    if (!r.getSuccess())
				{ logDebug("WARNING: error updating cap contact model : " + r.getErrorMessage()); }
			else
				{ logDebug("Successfully linked ref contact " + refPeopleId + " to cap contact " + ccmSeq);}


	    }  // end if user hand entered contact 
	}  // end for each CAP contact
} // end function


function cntAssocGarageSales(strnum, strname, city, state, zip, cfname, clname)
{

	/***

	Searches for Garage-Yard Sale License records 
	- Created in the current year 
	- Matches address parameters provided
	- Matches the contact first and last name provided
	- Returns the count of records

	***/

	// Create a cap model for search
	var searchCapModel = aa.cap.getCapModel().getOutput();

	// Set cap model for search. Set search criteria for record type DCA/*/*/*
	var searchCapModelType = searchCapModel.getCapType();
	searchCapModelType.setGroup("Licenses");
	searchCapModelType.setType("Garage-Yard Sale");
	searchCapModelType.setSubType("License");
	searchCapModelType.setCategory("NA");
	searchCapModel.setCapType(searchCapModelType);

	searchAddressModel = searchCapModel.getAddressModel();
	searchAddressModel.setStreetName(strname);

	gisObject = new com.accela.aa.xml.model.gis.GISObjects;
	qf = new com.accela.aa.util.QueryFormat;

	var toDate = aa.date.getCurrentDate();
	var fromDate = aa.date.parseDate("01/01/" + toDate.getYear()); 
	
	var recordCnt = 0;
	message = "The applicant has reached the Garage-Sale License limit of 3 per calendar year.<br>"

	capList = aa.cap.getCapListByCollection(searchCapModel, searchAddressModel, "", fromDate, toDate, qf, gisObject).getOutput();
	for (x in capList)
	{
		resultCap = capList[x];
		resultCapId = resultCap.getCapID();
		altId = resultCapId.getCustomID();
		//aa.print("Record ID: " + altId);
		resultCapIdScript = aa.cap.createCapIDScriptModel(resultCapId.getID1(),resultCapId.getID2(),resultCapId.getID3() );
		contact = aa.cap.getCapPrimaryContact(resultCapIdScript).getOutput();
		
		contactFname = contact.getFirstName();
		contactLname = contact.getLastName();
		
		if(contactFname==cfname && contactLname==clname)
		{
			recordCnt++;
			message = message + recordCnt + ": " + altId + " - " + contactFname + " " + contactLname + " @ " + strnum + " " + strname + "<br>";
		}		
	}
	
	return recordCnt;

}

function copyContactsWithAddress(pFromCapId, pToCapId)
{
   // Copies all contacts from pFromCapId to pToCapId and includes Contact Address objects
   //
   if (pToCapId == null)
   var vToCapId = capId;
   else
   var vToCapId = pToCapId;

   var capContactResult = aa.people.getCapContactByCapID(pFromCapId);
   var copied = 0;
   if (capContactResult.getSuccess())
   {
      var Contacts = capContactResult.getOutput();
      for (yy in Contacts)
      {
         var newContact = Contacts[yy].getCapContactModel();

         var newPeople = newContact.getPeople();
         // aa.print("Seq " + newPeople.getContactSeqNumber());

         var addressList = aa.address.getContactAddressListByCapContact(newContact).getOutput();
         newContact.setCapID(vToCapId);
         aa.people.createCapContact(newContact);
         newerPeople = newContact.getPeople();
         // contact address copying
         if (addressList)
         {
            for (add in addressList)
            {
               var transactionAddress = false;
               contactAddressModel = addressList[add].getContactAddressModel();
			   
			   logDebug("contactAddressModel.getEntityType():" + contactAddressModel.getEntityType());
			   
               if (contactAddressModel.getEntityType() == "CAP_CONTACT")
               {
                  transactionAddress = true;
                  contactAddressModel.setEntityID(parseInt(newerPeople.getContactSeqNumber()));
               }
               // Commit if transaction contact address
               if(transactionAddress)
               {
                  var newPK = new com.accela.orm.model.address.ContactAddressPKModel();
                  contactAddressModel.setContactAddressPK(newPK);
                  aa.address.createCapContactAddress(vToCapId, contactAddressModel);
               }
               // Commit if reference contact address
               else
               {
                  // build model
                  var Xref = aa.address.createXRefContactAddressModel().getOutput();
                  Xref.setContactAddressModel(contactAddressModel);
                  Xref.setAddressID(addressList[add].getAddressID());
                  Xref.setEntityID(parseInt(newerPeople.getContactSeqNumber()));
                  Xref.setEntityType(contactAddressModel.getEntityType());
                  Xref.setCapID(vToCapId);
                  // commit address
                  commitAddress = aa.address.createXRefContactAddress(Xref.getXRefContactAddressModel());
				  if(commitAddress.getSuccess())
				  {
					commitAddress.getOutput();
					logDebug("Copied contact address");
				  }
               }
            }
         }
         // end if
         copied ++ ;
         logDebug("Copied contact from " + pFromCapId.getCustomID() + " to " + vToCapId.getCustomID());
      }
   }
   else
   {
      logMessage("**ERROR: Failed to get contacts: " + capContactResult.getErrorMessage());
      return false;
   }
   return copied;
}


function changeCapContactTypes(origType, newType)
{
   // Renames all contacts of type origType to contact type of newType and includes Contact Address objects
   //
	var vCapId = capId;
	if (arguments.length == 3)
		vCapId = arguments[2];
   
   var capContactResult = aa.people.getCapContactByCapID(vCapId);
   var renamed = 0;
   if (capContactResult.getSuccess())
   {
      var Contacts = capContactResult.getOutput();
      for (yy in Contacts)
      {
         var contact = Contacts[yy].getCapContactModel();

         var people = contact.getPeople();
		 var contactType = people.getContactType();
          aa.print("Contact Type " + contactType);

		if(contactType==origType)
		{
		
			var contactNbr = people.getContactSeqNumber();	
			var editContact = aa.people.getCapContactByPK(vCapId, contactNbr).getOutput();
			editContact.getCapContactModel().setContactType(newType)
		
			aa.print("Set to: " + people.getContactType());
        	 renamed ++ ;
			 
			var updContactResult = aa.people.editCapContact(editContact.getCapContactModel());		
			logDebug("contact " + updContactResult);
			logDebug("contact.getSuccess() " + updContactResult.getSuccess());	
			logDebug("contact.getOutput() " + updContactResult.getOutput());
			updContactResult.getOutput();
			logDebug("Renamed contact from " + origType + " to " + newType);
		}
      }
   }
   else
   {
      logMessage("**ERROR: Failed to get contacts: " + capContactResult.getErrorMessage());
      return false;
   }
   return renamed;
}

function comparePeopleEnhanced(peop)
	{

	/* 
	
		this function will be passed as a parameter to the createRefContactsFromCapContactsAndLink function.
		takes a single peopleModel as a parameter, and will return the sequence number of the first G6Contact result
		returns null if there are no matches
	
		Best Practice Template Version uses the following algorithm:
		
		1.  Match on SSN/FEIN if either exist
		2.  else, match on Email Address if it exists
		3.  else, match on First, Middle, Last Name
		4.  else compare on Full Name
		
		This function can use attributes if desired
	*/
	

	if (peop.getSocialSecurityNumber() || peop.getFein())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();
		
		logDebug("we have a SSN " + peop.getSocialSecurityNumber() + " or FEIN, checking on that");
		qryPeople.setSocialSecurityNumber(peop.getSocialSecurityNumber());
		qryPeople.setFein(peop.getFein());
		
		var r = aa.people.getPeopleByPeopleModel(qryPeople);
		
		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();
		
		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	if (peop.getEmail())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();
		
		qryPeople.setServiceProviderCode(aa.getServiceProviderCode());	
	
		logDebug("we have an email, checking on that");
		qryPeople.setEmail(peop.getEmail());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();

		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	if (peop.getLastName() && peop.getFirstName())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();		
		qryPeople.setLastName(peop.getLastName());
		qryPeople.setFirstName(peop.getFirstName());
		if (peop.getMiddleName()) { qryPeople.setMiddleName(peop.getMiddleName()); }

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();

		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	if (peop.getFullName())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();		
		qryPeople.setFullName(peop.getFullName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();

		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	logDebug("ComparePeople did not find a match");
		return false;
	}
	
	function comparePeopleUAE(peop)
	{

	/* 
		this function will be passed as a parameter to the createRefContactsFromCapContactsAndLink function.
		takes a single peopleModel as a parameter, and will return the sequence number of the first G6Contact result
		returns null if there are no matches
	
		Best Practice Template Version uses the following algorithm:
		
		1.  Match on Passport Number/State ID Number if either exist
		2.  else, match on Email Address if it exists
		3.  else, match on First, Middle, Last Name
		4.  else compare on Full Name
		
		This function can use attributes if desired
	*/
	
	if (peop.getPassportNumber() || peop.getStateIDNbr())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();
		
		logDebug("we have a SSN " + peop.getPassportNumber() + " or FEIN, checking on that");
		if (peop.getPassportNumber()) qryPeople.setPassportNumber(peop.getPassportNumber());
		if (peop.getStateIDNbr()) qryPeople.setStateIDNbr(peop.getStateIDNbr());
		
		var r = aa.people.getPeopleByPeopleModel(qryPeople);
		
		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();
		
		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	if (peop.getEmail())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();
		
		qryPeople.setServiceProviderCode(aa.getServiceProviderCode());	
	
		logDebug("we have an email, checking on that");
		qryPeople.setEmail(peop.getEmail());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();

		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	if (peop.getLastName() && peop.getFirstName())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();		
		qryPeople.setLastName(peop.getLastName());
		qryPeople.setFirstName(peop.getFirstName());
		if (peop.getMiddleName()) qryPeople.setMiddleName(peop.getMiddleName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();

		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	if (peop.getFullName())
		{
		var qryPeople = aa.people.createPeopleModel().getOutput().getPeopleModel();		
		qryPeople.setFullName(peop.getFullName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess())  { logDebug("WARNING: error searching for people : " + r.getErrorMessage()); return false; }

		var peopResult = r.getOutput();

		if (peopResult.length > 0)
			{
			logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
			return peopResult[0].getContactSeqNumber();
			}
		}
		
	logDebug("Compare People did not find a match");
		return false;
	}

function updateAppNameToContactName(contactType){
	var appContact = null;
	var newname = "";
	var bContName = false;
	var itemCap = capId
	
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

	appContact = getContactObj(itemCap,contactType)

	peop = appContact.people;
    cont = appContact.capContact;
	
	if (cont.getLastName() != null){
		newname = cont.getLastName()
		bContName = true;
	}
	if (cont.getFirstName() != null && bContName){
		newname += ", " + cont.getFirstName()
	}
	if (peop.getMiddleName() != null && bContName){
		newname += " " + peop.getMiddleName();
	}
	if(peop.getBusinessName() != null && bContName){
		newname += " - " + peop.getBusinessName();
	}
	if(peop.getBusinessName() != null && bContName ==  false){
		newname = peop.getBusinessName();
	}
		editAppName(newname);
}

function validateAddressASIT(asiTableName){
/* 
|	For each row we will attempt to validate a reference address id based on what is provided and store
|	the id in the table along with the number of results returned to give an indication of how confident 
|	the match is
|	ASI Table Configuration
|	Column Number - Column Name - Description
|	01 - AddNo
|	02 - Street Name
|	03 - City
|	04 - State
|	05 - Zip
|	06 - Unit - Optional Field that could be used in search if ref addresses are available by unit
|	07 - Parcel Number - This will be used to validate the correct parcel number based on the address
|	08 - AddressID - Reference Address ID provided by the search
|	09 - Results - Number of results returned by the search
*/

var thisCap = capId;
	if (arguments.length == 2) thisCap = arguments[1];

var addrTableArray = new Array();

addrTableArray = loadASITable(asiTableName,thisCap);

if (addrTableArray.length > 0) {
var rowArr = new Array();

for (iAdd in addrTableArray){

	var refAddressResultsArray = new Array();
	refAddressResultsArray = refAddressSearch(addrTableArray[iAdd]["AddNo"],addrTableArray[iAdd]["Street Name"],addrTableArray[iAdd]["City"],addrTableArray[iAdd]["State"],addrTableArray[iAdd]["Zip"]);

	var rowVals = new Array();

	if (refAddressResultsArray && refAddressResultsArray.length == 1) {
		// We probably have a good match, use the first address in the array to update AddressID and 
		// Results and attempt to match Parcel Number
		refAddressResult = refAddressResultsArray[0];
		//objectExplore(refAddressResult);
		rowVals["AddNo"] = new asiTableValObj("AddNo","" + addrTableArray[iAdd]["AddNo"],"N"); //addrTableArray[iAdd]["AddNo"]
		rowVals["Street Name"] = new asiTableValObj("Street Name",refAddressResult.getStreetName(),"N"); //refAddressResult.getStreetName()
		// Add in the following if you use suffix in Street Name: + " " + refAddressResult.getStreetSuffix()
		rowVals["City"] = new asiTableValObj("City",refAddressResult.getCity(),"N");// 
		rowVals["State"] = new asiTableValObj("State",refAddressResult.getState(),"N");// 
		rowVals["Zip"] = new asiTableValObj("Zip",refAddressResult.getZip(),"N"); // 
		rowVals["Unit #"] = new asiTableValObj("Unit #","" + addrTableArray[iAdd]["Unit #"],"N"); // 

		var primaryParcelResult = aa.parcel.getPrimaryParcelByRefAddressID(refAddressResult.getRefAddressId(), "Y");
		if (primaryParcelResult.getSuccess()){
			var parcelNumber = primaryParcelResult.getOutput().getParcelNumber();
			
			rowVals["Parcel Number"] = new asiTableValObj("Parcel Number",parcelNumber.toString(),"N");
		}
		else {
			rowVals["Parcel Number"] = new asiTableValObj("Parcel Number","" + addrTableArray[iAdd]["Parcel Number"],"N");
		}
		//objectExplore((refAddressResult.getRefAddressId()).toString());
		rowVals["AddressID"] = new asiTableValObj("AddressID","" + refAddressResult.getRefAddressId(),"N");
		rowVals["Results"] = new asiTableValObj("Results","1","N");
	}
	if (refAddressResultsArray && refAddressResultsArray.length > 1) {
	// We don't have a good match, update results column but leave everything else intact and AddressID blank.
		rowVals["AddNo"] = new asiTableValObj("AddNo","" + addrTableArray[iAdd]["AddNo"],"N");
		rowVals["Street Name"] = new asiTableValObj("Street Name","" + addrTableArray[iAdd]["Street Name"],"N");
		rowVals["City"] = new asiTableValObj("City","" + addrTableArray[iAdd]["City"],"N");
		rowVals["State"] = new asiTableValObj("State","" + addrTableArray[iAdd]["State"],"N");
		rowVals["Zip"] = new asiTableValObj("Zip","" + addrTableArray[iAdd]["Zip"],"N");
		rowVals["Unit #"] = new asiTableValObj("Unit #","" + addrTableArray[iAdd]["Unit #"],"N");
		rowVals["Parcel Number"] = new asiTableValObj("Parcel Number","" + addrTableArray[iAdd]["Parcel Number"],"N");
		rowVals["AddressID"] = new asiTableValObj("AddressID","","N");
		rowVals["Results"] = new asiTableValObj("Results","" + refAddressResultsArray.length,"N");
	}

	if (refAddressResultsArray == null) {
	// We don't have any matches, update results column but leave everything else intact and AddressID blank.
		rowVals["AddNo"] = new asiTableValObj("AddNo","" + addrTableArray[iAdd]["AddNo"],"N");
		rowVals["Street Name"] = new asiTableValObj("Street Name","" + addrTableArray[iAdd]["Street Name"],"N");
		rowVals["City"] = new asiTableValObj("City","" + addrTableArray[iAdd]["City"],"N");
		rowVals["State"] = new asiTableValObj("State","" + addrTableArray[iAdd]["State"],"N");
		rowVals["Zip"] = new asiTableValObj("Zip","" + addrTableArray[iAdd]["Zip"],"N");
		rowVals["Unit #"] = new asiTableValObj("Unit #","" + addrTableArray[iAdd]["Unit #"],"N");
		rowVals["Parcel Number"] = new asiTableValObj("Parcel Number","" + addrTableArray[iAdd]["Parcel Number"],"N");
		rowVals["AddressID"] = new asiTableValObj("AddressID","","N");
		rowVals["Results"] = new asiTableValObj("Results","0","N");
	}
		//addToASITable(asiTableName, rowVals);
		rowArr.push(rowVals); 
} // End For Loop
if (rowArr && rowArr.length > 0) {
	// Remove previous table
	var tssmResult = aa.appSpecificTableScript.removeAppSpecificTableInfos(asiTableName,thisCap,"ADMIN");
	// Debug: for (var val in rowArr) for (var c in rowArr[val]) logDebug("Value " + c + ": " + rowArr[val][c]);
	// Add updated table
	addASITable(asiTableName,rowArr,thisCap);
}

}

}

function loadParcelsFromASITableToRecord(asiTableName){
// Use addParcelAndOwnerFromRefAddress
var thisCap = capId;
	if (arguments.length == 2) thisCap = arguments[1];

var addrTableArray = new Array();

addrTableArray = loadASITable(asiTableName,thisCap);

if (addrTableArray.length > 0) {
var rowArr = new Array();

for (iAdd in addrTableArray){
	
	var primaryParcelResult = aa.parcel.getPrimaryParcelByRefAddressID(addrTableArray[iAdd]["AddressID"], "Y");
	if (primaryParcelResult.getSuccess())
		var primaryParcel = primaryParcelResult.getOutput();
	else {
		logDebug("**ERROR: Failed to get primary parcel for ref Address " + refAddress + " , " + primaryParcelResult.getErrorMessage());
		return false;
	}

	var capParModel = aa.parcel.warpCapIdParcelModel2CapParcelModel(thisCap, primaryParcel).getOutput()

		var createPMResult = aa.parcel.createCapParcel(capParModel);
	if (createPMResult.getSuccess())
		logDebug("created CAP Parcel");
	else {
		logDebug("**WARNING: Failed to create the cap Parcel " + createPMResult.getErrorMessage());
	}
}
}
}


function refAddressSearch(houseNumStart,streetName,city,state,zip){
/*---------------------------------------------------------------------------------------------------------/
| Function Intent: 
|	This function is designed to search the reference Address Library for addresses and return an array 
|	of matching addresses if any are found. The required paramaters are able to be changed based on the
|	needs of the agency.
|
| Returns:
|	Outcome					
|	Success:	array of RefAddressModels
|	Failure:	null				
|
| Call Example:
|	refAddressSearch("16","Main St", "Bridgeview", "CA", "12345");	
|
| 01/05/2015 - Jason Plaisted based on code provided by Dane Q.
|	Version 1 Created
|
| Required paramaters in order:
|	houseNumStart
|	streetName
|
| Optional paramaters:
|	city
|	state
|	zip		
/----------------------------------------------------------------------------------------------------------*/

var refAddArray = null;
var refAdd = aa.proxyInvoker.newInstance("com.accela.aa.aamain.address.RefAddressModel").getOutput();

//May require APO Attributes for search be based on config. If so the following would be used
//var attr = aa.proxyInvoker.newInstance("com.accela.aa.aamain.apotemplate.L3APOAttributeModel").getOutput();

//Search parameters - enable any that apply for specific agency address data
refAdd.setHouseNumberStart(parseInt(houseNumStart));
//refAdd.setHouseNumberEnd();
refAdd.setStreetName(streetName);
//if !isEmpty(unitStart) refAdd.setUnitStart(unitStart);
if (!isEmpty(city)) refAdd.setCity(city);
if (!isEmpty(state)) refAdd.setState(state);
if (!isEmpty(zip)) refAdd.setZip(zip);


//get Results
refAddArray = aa.address.getRefAddressByServiceProviderRefAddressModel(refAdd).getOutput();
//logDebug("RefAdd " + refAdd); 
//objectExplore(refAdd[0]);

// Example of get ref address model by the ext_uid (XAPO ID) or address#
// var addr = aa.address.getRefAddressByPK("6528").getOutput();
if (!isEmpty(refAddArray)) logDebug("Reference Address Array Length: " + refAddArray.length);
return refAddArray;
}


//edit an ASIT with col/edit value where key matches col value
function editASITableRow(tableCapId, tableName, keyName, keyValue, editName, editValue) {
   var tableArr = loadASITable(tableName, tableCapId);
   var tssmResult = aa.appSpecificTableScript.removeAppSpecificTableInfos(tableName,tableCapId,"ADMIN");
   if (tableArr) {
      for (var r in tableArr) {
         if (tableArr[r][keyName] != keyValue) {
            var rowArr=new Array();
            var tempArr=new Array();
            for (var col in tableArr[r]) {
               var tVal = new asiTableValObj(tableArr[r][col].columnName, tableArr[r][col].fieldValue, tableArr[r][col].readOnly);
               var tVal = tableArr[r][col];
               //bizarre string conversion - just go with it
               var colName = new String(tableArr[r][col].columnName.toString());
               colName=colName.toString();
               tempArr[colName] = tVal;
            }
            rowArr.push(tempArr); 
            //for (var val in rowArr) for (var c in rowArr[val]) aa.print("Value " + c + ": " + rowArr[val][c]);
            addASITable(tableName,rowArr,tableCapId);
         }
         else {
            logDebug(" Editing row " + r);
            var rowArr=new Array();
            var tempArr=new Array();
            for (var col in tableArr[r]) {
               if (tableArr[r][col].columnName.toString() == editName) {
                  var tVal = tableArr[r][col];
                  tVal.fieldValue = editValue;
               }
               else {
                  var tVal = tableArr[r][col];
               }
               //bizarre string conversion - just go with it
               var colName = new String(tableArr[r][col].columnName.toString());
               colName=colName.toString();
               tempArr[colName] = tVal;
            }
            rowArr.push(tempArr); 
            //for (var val in rowArr) for (var c in rowArr[val]) aa.print("Value " + c + ": " + rowArr[val][c]);
            addASITable(tableName,rowArr,tableCapId);
         }
      }
   }//end loop
}

function objectExplore(objExplore){

aa.print("Object: " + objExplore.getClass());

aa.print("Methods:")
for (x in objExplore) {
	if (typeof(objExplore[x]) == "function") aa.print("   " + x);
}

aa.print("");
aa.print("Properties:")
for (x in objExplore) {
	if (typeof(objExplore[x]) != "function") aa.print("   " + x + " = " +
objExplore[x]);
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

function loadParcelAttributesByParcelArray(thisArr,parcelArray) {
	//
	// Returns an associative array of Parcel Attributes
	// Accepts a parcelArray from the ParcelSubmitOnSpearFormAfter event.
	// Example EMSE Script
	// 01 parcelList && parcelList.size() > 0 ^ parcelListArray= null;iParcel = 0; parcelListArray = parcelList.toArray();
	// 02 parcelListArray ^ loadParcelAttributesByParcelArray(AInfo,parcelListArray);
	// 03 true ^ aa.print("ParcelAttribute.Block - " + AInfo["ParcelAttribute.Block"]);
	
	
  	for (i in parcelArray)
  		{
		var parcelModelObj = parcelArray[i].getParcelModel();
		
		// Get the reference parcel information
		var prclObj = aa.parcel.getParceListForAdmin(parcelModelObj.getParcelNumber(), null, null, null, null, null, null, null, null, null);
			if (prclObj.getSuccess()) {
				var prclArr = prclObj.getOutput();
				if (prclArr.length) {
					var refParcelModelObj = prclArr[0].getParcelModel();
					//parcelArea += parcelModelObj.getParcelArea()
					parcelAttrObj = refParcelModelObj.getParcelAttribute();
					if (parcelAttrObj) {
					parcelAttrObj = parcelAttrObj.toArray();
					for (z in parcelAttrObj)
						thisArr["ParcelAttribute." + parcelAttrObj[z].getAttributeName()]=parcelAttrObj[z].getAttributeValue();
					}
					
					// Explicitly load some standard values
					thisArr["ParcelAttribute.ParcelNumber"] = refParcelModelObj.getParcelNumber();
					thisArr["ParcelAttribute.Block"] = refParcelModelObj.getBlock();
					thisArr["ParcelAttribute.Book"] = refParcelModelObj.getBook();
					thisArr["ParcelAttribute.CensusTract"] = refParcelModelObj.getCensusTract();
					thisArr["ParcelAttribute.CouncilDistrict"] = refParcelModelObj.getCouncilDistrict();
					thisArr["ParcelAttribute.ExemptValue"] = refParcelModelObj.getExemptValue();
					thisArr["ParcelAttribute.ImprovedValue"] = refParcelModelObj.getImprovedValue();
					thisArr["ParcelAttribute.InspectionDistrict"] = refParcelModelObj.getInspectionDistrict();
					thisArr["ParcelAttribute.LandValue"] = refParcelModelObj.getLandValue();
					thisArr["ParcelAttribute.LegalDesc"] = refParcelModelObj.getLegalDesc();
					thisArr["ParcelAttribute.Lot"] = refParcelModelObj.getLot();
					thisArr["ParcelAttribute.MapNo"] = refParcelModelObj.getMapNo();
					thisArr["ParcelAttribute.MapRef"] = refParcelModelObj.getMapRef();
					thisArr["ParcelAttribute.ParcelStatus"] = refParcelModelObj.getParcelStatus();
					thisArr["ParcelAttribute.SupervisorDistrict"] = refParcelModelObj.getSupervisorDistrict();
					thisArr["ParcelAttribute.Tract"] = refParcelModelObj.getTract();
					thisArr["ParcelAttribute.PlanArea"] = refParcelModelObj.getPlanArea();
					
				}
			}
			
  		}
	}

function addStdParcelCondition(parcelNum, cType,cDesc,cComment)
//if parcelNum is null, condition is added to all parcels on CAP
{
	if (!parcelNum){
		logDebug( "**ERROR: adding condition to Parcel " + parcelNum + "  (" + cType + "): " + addParcelCondResult.getErrorMessage());
	}
	else
	{
	if (!aa.capCondition.getStandardConditions) {
		logDebug("addStdCondition function is not available in this version of Accela Automation.");
	} else {
		standardConditions = aa.capCondition.getStandardConditions(cType, cDesc).getOutput();
		for (i = 0; i < standardConditions.length; i++)
			if (standardConditions[i].getConditionType().toUpperCase() == cType.toUpperCase() && standardConditions[i].getConditionDesc().toUpperCase() == cDesc.toUpperCase()) //EMSE Dom function does like search, needed for exact match
			{
				standardCondition = standardConditions[i];
				
				if (cComment)
					cComment = standardCondition.getConditionComment();
				
				var addParcelCondResult = addParcelCondition(parcelNum, standardCondition.getConditionType, standardCondition.getConditionDesc(), cComment, null, null, standardCondition.getImpactCode(), "Applied", sysDate, null, sysDate, sysDate, systemUserObj, systemUserObj, "A", standardCondition.getDisplayConditionNotice(), standardCondition.getIncludeInConditionName(), standardCondition.getIncludeInShortDescription(), standardCondition.getInheritable(), standardCondition.getLongDescripton(), standardCondition.getPublicDisplayMessage(), standardCondition.getResolutionAction(), standardCondition.getPriority()); 
			
		        if (addParcelCondResult && addParcelCondResult.getSuccess())
		        {
				logMessage("Successfully added condition to Parcel " + parcelNum + "  (" + cType + ") " + cDesc);
				logDebug("Successfully added condition to Parcel " + parcelNum + "  (" + cType + ") " + cDesc);
				}
				else
				{
				logDebug( "**ERROR: adding condition to Parcel " + parcelNum + "  (" + cType + "): " + addParcelCondResult.getErrorMessage());
				}
			}
	}
			
			
	}
}