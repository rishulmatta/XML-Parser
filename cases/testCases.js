window.onload = function () {

QUnit.test( "One root element positive tests", function( assert ) {
  assert.equal( initiator({data:"<root></root>"}), "success", "Only one element " );
  assert.equal( initiator({data:"<root><a></a></root>"}), "success" , "two nested  elements" );
  
});


  
QUnit.test( "One root element negative tests", function( assert ) {
  assert.equal( initiator({data:"<root><a></a></root><b></b>"}), "failure" ,"two root elements throws error");
  assert.equal( initiator({data:"<root><a></a></root><b></b>"}), "failure" , "two root elements , one has nesting throws error");
});


QUnit.test( "Nesting positive tests", function( assert ) {
  assert.equal( initiator({data:"<root><a><b></b></a></root>"}), "success", "root -->parent --> child heirarchy" );
  assert.equal( initiator({data:"<root><a><b></b></a> <c></c></root>"}), "success" , "root --> parent1, parent2 -- child of parent1 heirarchy" );  
});

QUnit.test( "Nesting negative tests", function( assert ) {
  assert.equal( initiator({data:"<root><a><b><c></b></a></c></root>"}), "failure", "element c has been inappropriately nested but this all is in one line" );
  assert.equal( initiator({data:"<root><a><b><c>\n</b></a>\n</c></root>"}), "failure", "element c has been inappropriately nested but opening and closing for c and parent of c are in different lines" );
  //assert.equal( initiator({data:"<root><a><b></b></a> <c></c></root>"}), "success" , "root --> parent1, parent2 -- child of parent1 heirarchy" );  
});

}