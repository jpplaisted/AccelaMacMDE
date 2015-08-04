/** ************************************************************************************** 
	INCLUDES_DATA_LOAD.js - FUNCTIONS REQUIRED FOR EMSE DATA LOAD SCRIPTS:
	openDocument - opens a file from the filesystem
	downloadDoc - downloads a file from EDMS
	uploadDoc - uploads a file to EDMS
	govXMLAuthenticate - open GovXML connection
	CSVToArray - converts a comma delimited list into an array
	
	Base64 encode and decode functions - used to read the flat-file:
	StringBuffer
	Utf8EncodeEnumerator
	Base64DecodeEnumerator
*/

/** ************************************************************************************** 
*  
*/

/** ************************************************************************************** 
*  
*/

function logDebug(dstr)
	{
	if(showDebug)
		{
		aa.print(dstr)
		emailText+= dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"),dstr);
		aa.eventLog.createEventLog("DEBUG", "Batch Process", batchJobName, aa.date.getCurrentDate(), aa.date.getCurrentDate(),"", dstr,batchJobID);
		}
	}
	
function openDocument(docFilePath) {
	try
		{
			var file = new java.io.File(docFilePath);   
			var fin = new java.io.FileInputStream(file);
			var vstrin = new java.util.Scanner(fin);
			return (vstrin);
		}
	catch (err)
		{
			logDebug("Error reading CSV document: " + err.message);
			return null;
		}
}  //openDocument	


function downloadDoc (pCapID, pFileKey, pIsDecodeRequired, govXMLURL, agency, userName, password) {
	
	logDebug("***Start Document Download***");
	
	applicationState = govXMLAuthenticate(govXMLURL, agency, userName, password);
	
	var xmlRequest
	xmlRequest = '';
	xmlRequest += '<?xml version="1.0" encoding="utf-8"?>'
	xmlRequest += '<GovXML xmlns="http://www.accela.com/schema/AccelaOpenSystemInterfaceXML">'
	xmlRequest += '  <GetDocument>'
	xmlRequest += '     <System>'
	xmlRequest += '        <XMLVersion>GovXML-7.3.1</XMLVersion>'
	xmlRequest += '        <ServiceProviderCode>'+agency+'</ServiceProviderCode>'
	xmlRequest += '        <Username>'+userName+'</Username>'
	xmlRequest += '        <MaxRows>10</MaxRows>'
	xmlRequest += '        <StartRow>0</StartRow>'
	xmlRequest += '        <EndRow>0</EndRow>'
	xmlRequest += '        <TotalRows>0</TotalRows>'
	xmlRequest += '        <ApplicationState>'+applicationState+'</ApplicationState>'
	xmlRequest += '        <LanguageID>en-US</LanguageID>'
	xmlRequest += '    </System>'
	xmlRequest += '  <DocumentId>'
	xmlRequest += '     <Keys>'
	xmlRequest += '        <Key>' + pCapID.getID1() + '</Key>'
	xmlRequest += '        <Key>' + pCapID.getID2() + '</Key>'
	xmlRequest += '        <Key>' + pCapID.getID3() + '</Key>'
	xmlRequest += '        <Key>' + pFileKey + '</Key>'
	xmlRequest += '     </Keys>'
	xmlRequest += '  </DocumentId>'
	xmlRequest += '  <ObjectId>'
	xmlRequest += '     <Keys>'
	xmlRequest += '        <Key>' + pCapID.getID1() + '</Key>'
	xmlRequest += '        <Key>' + pCapID.getID2() + '</Key>'
	xmlRequest += '        <Key>' + pCapID.getID3() + '</Key>'
	xmlRequest += '     </Keys>'
	xmlRequest += '     <contextType>CAP</contextType>'
	xmlRequest += '  </ObjectId>'
	xmlRequest += '  </GetDocument>'
	xmlRequest += '</GovXML>'

	// logDebug("xmlRequest: " + xmlRequest);
	var parameter = 'xmlin='+xmlRequest;
	var postresp = aa.util.httpPost(govXMLURL,parameter);

	if (!postresp.getSuccess()) {
		logDebug("govXMLGetDocument error message: " + postresp.getErrorMessage());
		return false;
	}
	else {
		// get XML response
		xmlResponse = postresp.getOutput();
		//logDebug("govXMLGetDocument response: " + xmlResponse);
		
		// check for error in response
		if (getNode(xmlResponse,"Error") != "") { 
			logDebug("** ERROR returned in xmlResponse: " + getNode(xmlResponse,"Error")); 
			return false; 
		}
		
		// get document content from XML
		var documentContentBase64 = getNode(xmlResponse,"content");
		 //logDebug("Document content Base 64: " + documentContentBase64);
		
		// check if decode is required
		if (pIsDecodeRequired) {
			
			// remove XML carriage return: &#xD;
			var documentContentBase64NoCR = documentContentBase64.replace(/&#xD;/ig,"");
			 //logDebug("document Content Base 64 No Carriage Return: " + documentContentBase64NoCR);
			
			// decode 
			var documentContentDecoded = Base64.decode(documentContentBase64NoCR);
			//logDebug("document Content decoded: " + documentContentDecoded);
			
			// assign final value
			var documentContent = documentContentDecoded;
		} else {
			var documentContent = documentContentBase64;
		}
	}
	logDebug("***End Document Download***");
	return  documentContent;
}  // downloadDoc

/** ************************************************************************************** 
*  
*/
function uploadDoc (pCapID, pFileName, pContent, govXMLURL, agency, userName, password) {

	logDebug("***Start Document Upload***");
	logDebug("Successfully Uploaded File: " + pFileName);

	if ( null == applicationState || applicationState == '' ) {
		applicationState = govXMLAuthenticate(govXMLURL, agency, userName, password);
	}
	
	//  encode the file content
	var encodedPayload = Base64.encode(pContent);
	var fileSize = encodedPayload.length;
	logDebug("fileSize: " + fileSize);
	
	var xmlRequest
	xmlRequest = '';
	xmlRequest += '<?xml version="1.0" encoding="UTF-8"?>';
	xmlRequest += '<GovXML>';
	xmlRequest += '  <CreateDocument>';
	xmlRequest += '    <System>';
	xmlRequest += '      <XMLVersion>GovXML-7.3.1</XMLVersion>';
	xmlRequest += '      <ServiceProviderCode>'+agency+'</ServiceProviderCode>';
	xmlRequest += '      <Username>'+userName+'</Username>';
	xmlRequest += '      <MaxRows>10</MaxRows>';
	xmlRequest += '      <StartRow>0</StartRow>';
	xmlRequest += '      <EndRow>0</EndRow>';
	xmlRequest += '      <TotalRows>0</TotalRows>';
	xmlRequest += '      <ApplicationState>'+applicationState+'</ApplicationState>';
	xmlRequest += '      <LanguageID>en-US</LanguageID>';
	xmlRequest += '    </System>';
	xmlRequest += '  <ObjectId>';
	xmlRequest += '     <Keys>';
	xmlRequest += '        <Key>' + pCapID.getID1() + '</Key>';
	xmlRequest += '        <Key>' + pCapID.getID2() + '</Key>';
	xmlRequest += '        <Key>' + pCapID.getID3() + '</Key>';
	xmlRequest += '     </Keys>';
	xmlRequest += '     <contextType>CAP</contextType>';
	xmlRequest += '  </ObjectId>';
	xmlRequest += '    <Document>';
	xmlRequest += '      <contextType>text/txt</contextType>';
	xmlRequest += '      <autodownload>False</autodownload>';
	xmlRequest += '        <Type>';
	xmlRequest += '          <Keys>';
	xmlRequest += '            <Key>Attachment</Key>';
	xmlRequest += '            <Key>Attachment</Key>';
	xmlRequest += '          </Keys>';
	xmlRequest += '          <IdentifierDisplay>Attachment</IdentifierDisplay>';
	xmlRequest += '        </Type>';
	xmlRequest += '        <Description>Exception File</Description>';
	xmlRequest += '        <DocumentLocators>';
	xmlRequest += '          <ElectronicFileLocator>';
	xmlRequest += '            <fileName>'+ pFileName + '</fileName>';
	xmlRequest += '            <fileSize>'+ fileSize + '</fileSize>';
	xmlRequest += '          </ElectronicFileLocator>';
	xmlRequest += '        </DocumentLocators>';
	xmlRequest += '        <content>'+ encodedPayload + '</content>';
	xmlRequest += '		<displayImage>Y</displayImage>'; 
	xmlRequest += '    </Document>';
	xmlRequest += '  </CreateDocument>';
	xmlRequest += '</GovXML>';

	//	no need to save payload on the file system
	file = aa.util.writeToFile(encodedPayload, pFileName);
	logDebug("File saved to the file system: "+ pFileName);


	// logDebug("xmlRequest: " + xmlRequest);
	var parameter = 'xmlin='+xmlRequest;
	var postresp = aa.util.httpPost(govXMLURL,parameter);
	
	if (postresp.getSuccess()) {
	  var xmlResponse = postresp.getOutput();
	   //logDebug("xmlResponse: " + xmlResponse);  
	}
	else {
		logDebug("** ERROR in govXMLCreateDocument. Message: " + postresp.getErrorMessage());
		return false; 
	}
	
	if (getNode(xmlResponse,"Error") != "") { 
		logDebug("** ERROR returned in xmlResponse: " + getNode(xmlResponse,"Error")); 
		return false; 
	}
		
	logDebug("    ***End Document Upload***");

	return true;
	/********************** Sample Response	
	<?xml version="1.0" encoding="utf-8"?>
	<GovXML xmlns="http://www.accela.com/schema/AccelaWirelessXML">
	  <CreateDocumentResponse>
		<DocumentId>
		  <Keys>
			<Key>13CAP</Key>
			<Key>00000</Key>
			<Key>001WE</Key>
			<Key>0900000180073ca5</Key>
		  </Keys>
		</DocumentId>
		<Document>
		  <DocumentLocators>
			<ElectronicFileLocator>
			  <Keys>
				<Key>0900000180073ca5</Key>
			  </Keys>
			  <fileName>ALBA_BusinessCategory_BulkInsp_Exceptions_201309040510.csv</fileName>
			  <fileDateTime></fileDateTime>
			  <fileSize>356.0</fileSize>
			  <serverVendor>FRAMER</serverVendor>
			</ElectronicFileLocator>
		  </DocumentLocators>
		</Document>
		<System>
		  <XMLVersion>720</XMLVersion>
		  <ServiceProviderCode>LICENSING</ServiceProviderCode>
		  <Username>framer</Username>
		  <MaxRows>10</MaxRows>
		  <StartRow>0</StartRow>
		  <EndRow>0</EndRow>
		  <TotalRows>0</TotalRows>
		  <ApplicationState>18645831413517474919</ApplicationState>
		  <LanguageID>en-US</LanguageID>
		</System>
	  </CreateDocumentResponse>
	</GovXML>
	***********************/
}  // uploadDoc

/** ************************************************************************************** 
*  
*/
function govXMLAuthenticate(govXMLURL, agency, userName, Password) {

	logDebug("***Start GovXML Authentication***");
	
	var xmlRequest
	xmlRequest = '';
	xmlRequest += '<?xml version="1.0" encoding="utf-8"?>'
	xmlRequest += '<GovXML xmlns="http://www.accela.com/schema/AccelaOpenSystemInterfaceXML">'
	xmlRequest += '  <AuthenticateUser>'
	xmlRequest += '     <System>'
	xmlRequest += '        <XMLVersion>GovXML-7.3.1</XMLVersion>'
	xmlRequest += '        <ServiceProviderCode>'+agency+'</ServiceProviderCode>'
	xmlRequest += '     </System>'
	xmlRequest += '     <Username>'+userName+'</Username>'
	xmlRequest += '     <Password>'+Password+'</Password>'
	xmlRequest += '  </AuthenticateUser>'
	xmlRequest += '</GovXML>'
	 
	var parameter = 'xmlin='+xmlRequest;
	var postresp = aa.util.httpPost(govXMLURL,parameter);

	if (!postresp.getSuccess()) {
		logDebug("govXMLAuthenticate error message: " + postresp.getErrorMessage());
	}
	else {
		xmlResponse = postresp.getOutput();
		//logDebug("govXMLAuthenticate response: " + xmlResponse);
		applicationState = getNode(xmlResponse, "ApplicationState");
		//logDebug("applicationState: " + applicationState);
	}
	
	logDebug("***End GovXML Authentication***");
	return applicationState;
}


/** ************************************************************************************** 
*  
*/
function CSVToArray( csvAsString, strDelimiter ){
	
	//logDebug("***Start CSVToArray()***");

	// Check to see if the delimiter is defined. If not, then default to comma.
	strDelimiter = (strDelimiter || ",");
	//logDebug("strDelimiter: " + strDelimiter);
	csvAsString += "\r\n";

	var csvAsArray = csvAsString.csvToArray({ fSep:strDelimiter });
	// var csvAsArray = csvAsString.csvToArray();
	// for (i in csvAsArray[0]) {
		// logDebug("csvAsArray[0]["+i+"]: " + csvAsArray[0][i]);
	// }

	//logDebug("    ***End CSVToArray()***");
	return( csvAsArray[0] );
} // CSVToArray



/** ************************************************************************************** 
*  Base64 encode and decode functions
*/
function StringBuffer() { 
	this.buffer = []; 
} 

StringBuffer.prototype.append = function append(string) { 
	this.buffer.push(string); 
	return this; 
}; 

StringBuffer.prototype.toString = function toString() { 
	return this.buffer.join(""); 
}; 

var Base64 =
{
	codex : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

	encode : function (input) {
		var output = new StringBuffer();

		var enumerator = new Utf8EncodeEnumerator(input);
		while (enumerator.moveNext())
		{
			var chr1 = enumerator.current;

			enumerator.moveNext();
			var chr2 = enumerator.current;

			enumerator.moveNext();
			var chr3 = enumerator.current;

			var enc1 = chr1 >> 2;
			var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			var enc4 = chr3 & 63;

			if (isNaN(chr2))
			{
				enc3 = enc4 = 64;
			}
			else if (isNaN(chr3))
			{
				enc4 = 64;
			}

			output.append(this.codex.charAt(enc1) + this.codex.charAt(enc2) + this.codex.charAt(enc3) + this.codex.charAt(enc4));
		}

		return output.toString();
	},

	decode : function (input) {
		var output = new StringBuffer();

		var enumerator = new Base64DecodeEnumerator(input);
		while (enumerator.moveNext())
		{
			var charCode = enumerator.current;

			if (charCode < 128)
				output.append(String.fromCharCode(charCode));
			else if ((charCode > 191) && (charCode < 224))
			{
				enumerator.moveNext();
				var charCode2 = enumerator.current;

				output.append(String.fromCharCode(((charCode & 31) << 6) | (charCode2 & 63)));
			}
			else
			{
				enumerator.moveNext();
				var charCode2 = enumerator.current;

				enumerator.moveNext();
				var charCode3 = enumerator.current;

				output.append(String.fromCharCode(((charCode & 15) << 12) | ((charCode2 & 63) << 6) | (charCode3 & 63)));
			}
		}

		return output.toString();
	}
}

function Utf8EncodeEnumerator(input) {
	this._input = input;
	this._index = -1;
	this._buffer = [];
}

Utf8EncodeEnumerator.prototype =
{
	current: Number.NaN,

	moveNext: function()
	{
		if (this._buffer.length > 0)
		{
			this.current = this._buffer.shift();
			return true;
		}
		else if (this._index >= (this._input.length - 1))
		{
			this.current = Number.NaN;
			return false;
		}
		else
		{
			var charCode = this._input.charCodeAt(++this._index);

			// "\r\n" -> "\n"
			//
			if ((charCode == 13) && (this._input.charCodeAt(this._index + 1) == 10))
			{
				charCode = 10;
				this._index += 2;
			}

			if (charCode < 128)
			{
				this.current = charCode;
			}
			else if ((charCode > 127) && (charCode < 2048))
			{
				this.current = (charCode >> 6) | 192;
				this._buffer.push((charCode & 63) | 128);
			}
			else
			{
				this.current = (charCode >> 12) | 224;
				this._buffer.push(((charCode >> 6) & 63) | 128);
				this._buffer.push((charCode & 63) | 128);
			}

			return true;
		}
	}
}

function Base64DecodeEnumerator(input) {
	this._input = input;
	this._index = -1;
	this._buffer = [];
}

Base64DecodeEnumerator.prototype =
{
	current: 64,

	moveNext: function()
	{
		if (this._buffer.length > 0)
		{
			this.current = this._buffer.shift();
			return true;
		}
		else if (this._index >= (this._input.length - 1))
		{
			this.current = 64;
			return false;
		}
		else
		{
			var enc1 = Base64.codex.indexOf(this._input.charAt(++this._index));
			var enc2 = Base64.codex.indexOf(this._input.charAt(++this._index));
			var enc3 = Base64.codex.indexOf(this._input.charAt(++this._index));
			var enc4 = Base64.codex.indexOf(this._input.charAt(++this._index));

			var chr1 = (enc1 << 2) | (enc2 >> 4);
			var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			var chr3 = ((enc3 & 3) << 6) | enc4;

			this.current = chr1;

			if (enc3 != 64)
				this._buffer.push(chr2);

			if (enc4 != 64)
				this._buffer.push(chr3);

			return true;
		}
	}
}; // end Base64 functions

/** ************************************************************************************** 
*  Convert a string to array.
*  Options:
*  			
*  fSep		',' (Default)		'1 character'
*  rSep		'\r\n' (Default)	'1-2 characters'
*  quot		'"' (Default)		'1 character'
*  head		false (Default)		true
*  trim		false (Default)		true
*
*  Example:
*  Override record separator with || and trim white space from fields
*  csvAsArray = csvAsString.csvToArray({ rSep:'||' , trim:true });
*/
String.prototype.csvToArray = function (o) {
	var od = {
		'fSep': ',',
		'rSep': '\r\n',
		'quot': '"',
		'head': false,
		'trim': false
	}
	if (o) {
		for (var i in od) {
			if (!o[i]) o[i] = od[i];
		}
	} else {
		o = od;
	}
	var a = [
		['']
	];
	for (var r = f = p = q = 0; p < this.length; p++) {
		switch (c = this.charAt(p)) {
		case o.quot:
			if (q && this.charAt(p + 1) == o.quot) {
				a[r][f] += o.quot;
				++p;
			} else {
				q ^= 1;
			}
			break;
		case o.fSep:
			if (!q) {
				if (o.trim) {
					a[r][f] = a[r][f].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
				}
				a[r][++f] = '';
			} else {
				a[r][f] += c;
			}
			break;
		case o.rSep.charAt(0):
			if (!q && (!o.rSep.charAt(1) || (o.rSep.charAt(1) && o.rSep.charAt(1) == this.charAt(p + 1)))) {
				if (o.trim) {
					a[r][f] = a[r][f].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
				}
				a[++r] = [''];
				a[r][f = 0] = '';
				if (o.rSep.charAt(1)) {
					++p;
				}
			} else {
				a[r][f] += c;
			}
			break;
		default:
			a[r][f] += c;
		}
	}
	if (o.head) {
		a.shift()
	}
	if (a[a.length - 1].length < a[0].length) {
		a.pop()
	}
	return a;
}