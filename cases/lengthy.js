addEventListener("message",initiator, false);


function initiator (evt) {
  var xmlString;
	xmlString = evt.data.toString() ;
	console.group("starting parsing");
	//validateClosingTag(xmlString,1);
	if (validateStrayCharacters(xmlString)) {
		validateTagClosingAndNesting(xmlString);
	}
	console.groupEnd();
	try { // if we are testing worker then postMessage wont work
		if (error.length > 0 ) {
			postMessage(error);
	   }
	   else {
		postMessage("Success");
	   }
   }
   catch(e) {
	console.log("Worker is being tested hence postMessage didnt work");
	if (error.length > 0 ) {
			console.error(JSON.stringify(error));
			return ("failure");
	   }
	   else {
			return ("success");
	   }
   }
}


String.prototype.trimXml = function  () {
//we check here if someone enters a string of spaces or new line characters then we return null in trim function
	if (/\S/.test(this)) {
	
		return this.replace(/^\s*</g,"<").replace(/\s*=\s*/g , "=").replace(/<\s+/g,"<").replace(/<\/\s+/g,"<").replace(/\s+>/g,">");
	}
	else {
		return null;
	}
}

var error = [];

var regExp = {

	//strayCharacters:/>+\s*(\w+)\s*<+/ , 
	strayCharacters:/>\s*(\w+)/,
	startingTag:/<(\w+)/
};



function addError (tagName , errorMsg , lineNumber) {
	
	error.push({
		tagName : tagName,
		errorMsg : errorMsg,
		lineNumber : lineNumber
	});

}



function validateTagClosingAndNesting (xmlString) {

	var limit , ii , lineNumber , invalid ;
	var lineLength , lineSet , totalLines , currentLine , stack = [] ,lastStackElement;  //variables for string processing
	
	var openingTags = xmlString.match(/<\w+/g);
	var closingTags = xmlString.match(/<\\|\/\w+/g);
	
	
	//remove self closing tags for now!!!
	//xmlString = xmlString.replace(/<.+\/>/g,"");
	
	if (openingTags[0].substring(1) != closingTags[closingTags.length-1].substring(1)) {
		addError(openingTags[0] , "Invalid xml : There must be only one parent tag." );
		return false;
	}
	xmlString = xmlString.trimXml();
	lineSet = xmlString.split("\n");
	totalLines = lineSet.length;
	
	for (ii = 0; ii < totalLines ;++ii) {
		var	startingTag = /<(\w+:*\w*)/g;
		// var endingTag = /<\\|\/(\w+:*\w*)/g;
		var endingTag = /<\/(\w+:*\w*)/g;
		var pattern , selfTerminatingPattern , terminationOnSameLine , tagsParsedInThisLine = [];
		currentLine = lineSet[ii];
		lineLength = currentLine.length;
		
		while ( ((matchStartString = startingTag.exec(currentLine)) != null) ){
		
			if (validateClosingTag(matchStartString,currentLine , ii)){
				validateAttributes(currentLine , ii);
				stack.push({tag:matchStartString[1] , line:ii , characterIndex:matchStartString.index});	
			}
			
			selfTerminatingPattern = new RegExp("<"+ matchStartString[1]	+"[^>]+\/>"); //this is introduced because self terminating tags  were causing a bug these tags have NO NESTING
			terminationOnSameLine = new RegExp("<\/"+ matchStartString[1]	+"[^>]*?>"); //this is introduced because tags opening and closing in same line were causing a bug these tags have  NESTING
			
			var exp = currentLine.match(selfTerminatingPattern);
			if (selfTerminatingPattern.test(currentLine) ) {
				stack.pop(); //pop the element which is terminating on the same line
				
			}
			
			if (terminationOnSameLine.test(currentLine)) {
				tagsParsedInThisLine[matchStartString[1]] = true; //this is introduced because tags opening and closing in same line were causing a bug
				stack.pop();
			}
		}
		
		
		while ( ((matchEndString = endingTag.exec(currentLine)) != null)  ){	
			
			if ( (validateClosingTag(matchEndString,currentLine , ii)) && (!tagsParsedInThisLine[matchEndString[1]]) ){ 
				
				lastStackElement = stack.pop();
				if (matchEndString[1] == lastStackElement.tag) {
					continue;
				}
				else {					
					addError(lastStackElement.tag , "Improper nesting of tag : " +lastStackElement.tag + " with " + matchEndString[1] , lastStackElement.line +"to"+ ii);
					return false;
				}
			}
				
		}
		
		tagsParsedInThisLine = [];
	}
	
	if (stack) {
		
		for (ii = 0 ; ii < stack.length ; ++ii) {
		
			addError(stack[ii].tag , "No closing/opening tags found for the tags" , stack[ii].line);
		}
				return false;
	}
	
	return true;
}


function validateAttributes (attributeString , line) {
	var identifier = ' ' , flag = false;
	attributeString = attributeString.replace(/=\s+/g,"=");
	for (ii = 0; ii < attributeString.length ; ++ii) {
		var c = attributeString.charAt(ii);
		switch (true) {
			
			case /\w+/.test(c) :
								identifier += c;
				break;
				
			case /=/.test(c) :
								identifier += c;
								ii++; //check for the next charac
								c = attributeString.charAt(ii);
								if( (c != '"') && (c != '\'') ) {
									addError( identifier, "Improper initialization of the attribute", line);
									return false;
								}
								ii++; //increment to the next char
								for ( ;ii < attributeString.length ; ++ii) { 
									c = attributeString.charAt(ii);
									if( c == '=' ) {
										flag = false;
										break;
									}
									
									if( (c == '"') || (c == '\'')  ) {
										flag = true;
										break;
									}
									
									
								}
								
								if (!flag) {
									addError( identifier, "Improper termination of the attribute", line);
									return false;
								}
								flag = false;
								identifier = ' ';
				break;
		}
	}
}


function validateStrayCharacters (xmlString) {
	var lineNumber;
	var matchString = xmlString.match(regExp.strayCharacters);
	if (matchString) {
		//lineNumber = xmlString.substring(0,matchString[0]).match(/\n/g).length;
		addError(matchString[1], "Stray characters",lineNumber);
		return false;
	}
	return true;
}


function validateClosingTag (matchString , currentLine , line) {

	var pattern = new RegExp(matchString[0]+".*?>");
	if (pattern.test(currentLine)){ 
		
		return true;
	}
	else {
	
		addError(matchString[1] , "Missing '>' character" ,  line);
		return false;
	}
}


//this is a dfs implementation
function validateClosingTag1 (xmlString ,  numberOfChildren ) {

	
	var tag = /<(\w+)([^>]*)>([\s\S]*)<\/\1>/g, matchString;
	var counter = 0;
	// 1st subgroup which tells us the name of the element
	//2nd subgroup which gives us the list of attributes
	//3rd which returns the contents with in the xml tag
	xmlString = xmlString.trimXml();

	
	do{
		counter++;
		
		matchString = tag.exec(xmlString);
		
		//this condition means that the pattern is valid with opening and closing tags
		//so now we need to verify the attributes		
		if(matchString && typeof matchString[3] !== 'undefined'){
			
			console.group ("tags parsed : " + matchString[1]);
			//check that the inner content of the tag is not null only then do the recursion
			if (matchString[3].trimXml()) {	
				
				
			}
			console.groupEnd();
		}
		else {
			if (xmlString && /\S/.test(xmlString) ) {  //we check for falsy nature of xmlString because if someone enters a string of spaces or new line characters then we return null in trim function
			
				if (counter <= numberOfChildren) {
					error.push ({
									tag:"error in a tag", 
									line:"",
									error:"Some error"
								});							
				}
			}	
				
		}
	}while(matchString && /\S/.test(matchString)) //match string should not be null if it becomes null it means all siblings have been covered or error has occured , while loop is used because we have to iterate on all the siblings 
	
	
	
}

function execMethod (xmlString) {
	console.log("starting parsing");
	var tag = /<(\w+)([^>]*)>[\s\S]*<\/\1>/g, match;
	
	while ((match = tag.exec(xmlString))!== null) {
		match;
	}
	
	postMessage("completed");
}