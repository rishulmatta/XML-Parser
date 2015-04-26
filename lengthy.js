addEventListener("message",initiator, false);


function initiator (evt) {
  var xmlString;
	xmlString = evt.data.toString() ;
	console.group("starting parsing");
	//validateClosingCharacter(xmlString,1);
	if ( xmlString.validateStrayCharacters() ) {
		validateTagClosingAndNesting(xmlString);
	}
	console.groupEnd();
	
	console.log (JSON.stringify(obj));
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

Array.prototype.isEmpty = function () {
	if (this && this.length > 0) {
		return false;
	}
	else {
		return true;
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

String.prototype.validateStrayCharacters = function () {
	var lineNumber;
	var matchString = this.match(regExp.strayCharacters);
	if (matchString) {
		//lineNumber = xmlString.substring(0,matchString[0]).match(/\n/g).length;
		addError(matchString[1], "Stray characters",lineNumber);
		return false;
	}
	return true;
}

var error = [], stack = [] , obj = {} , root;

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
	var lineLength , lineSet , totalLines , currentLine  ,lastStackElement;  //variables for string processing
	
	var openingTags = xmlString.match(/<\w+/g);
	var closingTags = xmlString.match(/<\\|\/\w+/g);
	
	

	//check for only one leement in xml
	if (openingTags[0].substring(1) != closingTags[closingTags.length-1].substring(1)) {
		addError(openingTags[0] , "Invalid xml : There must be only one parent tag." );
		return false;
	}
	root = openingTags[0].substring(1);
	//obj[root] = {}; //add first object
	
	//trim the string and get the complete lineset
	xmlString = xmlString.trimXml();
	lineSet = xmlString.split("\n");
	totalLines = lineSet.length;
	
	//iterte over the lines and parse them one by one
	for (ii = 0; ii < totalLines ;++ii) {
		var	startingTag = /<(\w+:*\w*)/g;
		// var endingTag = /<\\|\/(\w+:*\w*)/g;
		var endingTag = /<\/(\w+:*\w*)/g;
		var pattern , selfTerminatingPattern , terminationOnSameLine , tagsParsedInThisLine = [] , completeTag;
		currentLine = lineSet[ii];
		lineLength = currentLine.length;
		
		while ( ((matchStartString = startingTag.exec(currentLine)) != null) ){
		
			if ( (completeTag = validateClosingCharacter(matchStartString,currentLine , ii)) != false){
				
				stack.push({tag:matchStartString[1] , line:ii , characterIndex:matchStartString.index});	
				validateAttributes(completeTag[0] , ii);
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
			
			if ( (validateClosingCharacter(matchEndString,currentLine , ii)) && (!tagsParsedInThisLine[matchEndString[1]]) ){ 
				
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



//this validates if all the attribute validation occurs refer to excel for bugs and open issues is where json conversion can be triggered
function validateAttributes (attributeString , line) {
//bug in this function is that if an element appears without any attributes then it is not added :)
	var identifier = ' ' , flag = false , tagName = false , value = ' ' , attributeFound = false , attributeArray = [];
	var tempObj = {};
	attributeString = attributeString.replace(/=\s+/g,"=");
	
	for (ii = 0; ii < attributeString.length ; ++ii) {
		var c = attributeString.charAt(ii);
		switch (true) {
			
			case /[a-zA-Z:]/.test(c) :
								identifier += c;
				break;
				
			case /=/.test(c) :
								if (tagName) {
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
										
										value += c;
									}
									
									if (!flag) {
										addError( identifier, "Improper termination of the attribute", line);
										return false;
									}
									//if attributes are found then add in the json obj
									//addInObject(tagName.substring(1) ,identifier.substring(1),value.substring(1) );
									
									tempObj[identifier] = value;
									
									attributeFound = true; //this flag was added for elements which dont have attributes
									flag = false;
									identifier = ' ';
								}
								else {
									addError( attributeString, "Improper declaration of the tag : name must be followed by the attribute declaration", line);
										return false;
								}
								
				break;
				
			case /\s+/.test(c) :
								if (!tagName) {
									tagName = identifier;
									identifier = "";
								}
				break;
		}
	}
	
	if (!attributeFound) {
		tagName = identifier;
		addInObject(tagName.substring(1) ,null,null );
	}else {
		addInObject(tagName.substring(1) ,tempObj);
	}
}





function addInObject(tagName , attributeArray) {
	
	//this is called when attributes are being validated so atthis time we have the complete nesting of the element in the stack 
	//so use the stack to reach till the nested level and then put the attributes
	var tempStack = [] , tempObj = {};
	tempObj = obj;
	if (tagName == "EntityType") {
		console.log("found entity type");
	}
	while(!stack.isEmpty()) {
		tempStack.push(stack.pop());
	}
	addProperty(obj ,tempStack, tagName , attributeArray);
	
	while(!tempStack.isEmpty()) {
		var popedElement = tempStack.pop();
		/*if (typeof tempObj[popedElement.tag] == 'undefined') {
			tempObj[popedElement.tag] = {};
		}
		else {
			tempObj = tempObj[popedElement.tag];
		}*/
		
		stack.push(popedElement);
	}
	
	//tempObj[popedElement.tag][attributeName] = attributeValue;
	//obj = tempObj;
	
}

function addProperty (localObj , stack , tag , attributeObject) 
{
	var poppedElement = stack.pop();
	try {
			if(stack.isEmpty()) 
			{
				if ( typeof localObj[tag] == "undefined") 
				{
					localObj[tag] = {};	
					if (attributeObject) 
					{
					
						for (var attrName in attributeObject) 
						{
							localObj[tag][attrName] = attributeObject[attrName];
						}
						
					}
					
				}
				else 
				{
					if (typeof localObj[tag].length == "undefined") 
					{
							var bObj = localObj[tag];
							localObj[tag] = [];
							localObj[tag].push(bObj);
					}
					if (attributeObject ) 
					{
						var dObj = {};
						for (var attrName in attributeObject) 
						{
							dObj[attrName] = attributeObject[attrName];
						}
						localObj[tag].push(dObj);
					}
					//after converting to arrray pump the new values
					/*else 
					if (typeof localObj[tag].length == "number") {
						var dObj = {};
						dObj[property] = value;
						localObj[tag][property].push(dObj);
					}
					else {
						//self terminating tags become an array of objects 
						if (typeof localObj[tag][property].length == "undefined") {
							var bObj = localObj[tag][property];
							localObj[tag][property] = [];
							localObj[tag][property].push(bObj);
						}
						//after converting to arrray pump the new values
						else 
						if (typeof localObj[tag][property].length == "number") {
							var dObj = {};
							dObj[property] = value;
							localObj[tag][property].push(dObj);
						}*/			
					
				}
				
				
				
			}
			else 
			{
				
				addProperty (localObj[poppedElement.tag] , stack , tag , attributeObject);
			}
		}
		catch (e) 
		{
			console.log(e);
		}
	stack.push(poppedElement);
} 

//this method checks if '>' character has been found in the element or not , 
function validateClosingCharacter (matchString , currentLine , line) {

	var pattern = new RegExp(matchString[0]+".*?>");
	if (pattern.test(currentLine)){ 
		
		return currentLine.match(pattern);
	}
	else {
	
		addError(matchString[1] , "Missing '>' character" ,  line);
		return false;
	}
}


//this is a dfs implementation deprecated
function validateClosingCharacter1 (xmlString ,  numberOfChildren ) {

	
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