// ======================================
// Auto Suggestion for wiki editors
// 
var XWiki = (function (XWiki) {
// Start XWiki augmentation.
var autosuggestion = XWiki.autosuggestion = XWiki.autosuggestion || {};

/**
 * Suggestion Box is used to hold the suggestion list for auto suggestion
 */
autosuggestion.SuggestionBox = Class.create({
  /** The position to show the suggestion box */ 											
  position : null,
  /** The default size of the suggestion box */
  size : {"width":200, "height":400},
  /** The title for suggestion box */
  title : "",
  /** {"type:"wiki/wysiwyg, "obj":editorObj} */
  editor : null, 
  /** The selected index for suggestion list */
  index : -1,
  
  /** The Html template for suggestion box container */
  /*containerHtmlTemplate : '<div id="suggestion_box_container">'
  	+'<div id="suggestion_box" class="container">'
	  +'<div id="suggestion_title"></div>'
	  +'<div id="suggestion_resultList"></div>'
	  +'<div id="suggestion_toolbar"></div>'
	+'</div>'
  +'</div>',*/
  /**
   * Initialization: Add the suggestion box dom to the end of body and update the position and size 
   * of the suggestion box
   */
  initialize : function(position, size, editor) {
    if(editor == null){
      return;
    }
    this.editor = editor;
    // The container of the suggestion box
    var suggestion_box_container = new Element('div', {'id' : 'suggestion_box_container'});
    // The suggestion box
    var suggestion_box = new Element('div', {'class' : 'container', 'id' : 'suggestion_box'});
    suggestion_box_container.appendChild(suggestion_box);
    // The title container of suggestion box
    var suggestion_title = new Element('div', {'id' : 'suggestion_title'});
    suggestion_box.appendChild(suggestion_title);
    // The suggestion list container of the suggestion box
    var suggestion_resultList = new Element('div', {'id' : 'suggestion_resultList'});
    suggestion_box.appendChild(suggestion_resultList);
	// Toolbar container is only for wysiwyg editor
    if(this.editor.type == "wysiwyg") {
      var suggestion_toolbar = new Element('div', {'id' : 'suggestion_toolbar'});
      suggestion_box.appendChild(suggestion_toolbar);
    }
    document.body.appendChild(suggestion_box_container);
  },
  
  /**
   * Destroy the suggestion box, include: 
   * 1) Unbind the events of the suggestion box;
   * 2) Remove the dom of the suggestion box;
   */
  destroy : function() {
    if($('suggestion_box_container') == null) {
      return;
    }
    // Remove the suggestion box
    this.unBindSuggestionBoxEvents();
    $('suggestion_box_container').remove();
  },
  
  /**
   * Update the position and the size of the suggestion box 
   */
  updatePosition : function(position, size){
    if(position == null) return;
    if(size == null) size = this.size;
    this.size = size;
    this.position = position;
    $("suggestion_box_container").setStyle({
      "top": position.top + "px",
      "left": position.left + "px",
      "width": size.width + "px",
      "height": size.height + "px"
    });
  },
  
  isDestroyed : function(){
    return $("suggestion_box_container") == null ? true : false;
  },

  /**
   * Global listener for clicking the suggestion items in the suggestion box
   * @Param index The index of the clicked suggestion item
   * @Param itemList All the item doms in the suggestion box
   * @Param event The click event
   */
  onItemClick : function(index, itemList, event){
    this.itemClickHandler(index, itemList);
    //Focus on the editor in order to listen to the event specific to editor
    //like key navigation
    this.editor.obj.focus();
    itemList[index].addClassName("itemSelected");
  },
  
  /**
   * Global listener for double clicking the suggestion items in the suggestion box
   * @Param index The index of the clicked suggestion item
   * @Param itemList All the item doms in the suggestion box
   * @Param event The click event
   */
  onItemDbClick : function(index, itemList, event){
    this.itemDbClickHandler(index, itemList);
  },
  
  /**
   * Global listener for navigating the suggestion items by up and down keys
   * @Param itemList All the item doms in the suggestion box
   * @Param event The click event
   */
  onKeyNavigate : function(itemList, event) {
    var keyCode = event.keyCode;
    var i = this.index;
    switch(keyCode){
      case 40:
        i = i + 1;
        break;
      case 38:
        i = i - 1;
        break;
      case 13:
        var selectedValue = this.getSelectedItemValue(i);
        console.debug("selected item value:" + selectedValue);
        document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:selectedValue});
        this.destroy();
        return false;
        break;
      default:
        return true;
    }
	  
    i = i >= itemList.length ? 0 : i< 0 ? itemList.length-1 : i;
    Event.stop(event);
    return this.keyNavigateHandler(i, itemList);
  },
  
  /**
   * To show the results in the suggestion box
   * @Param results The suggestion results(json) for suggestion box
   * @Param position The position of the suggestion box
   * @Param size The size of the suggestion box
   */
  showSuggestion : function(results, position, size){
    //To overwirte
  },
  
  /**
   * Handler for clicking the suggestion items
   */
  itemClickHandler :function(index, itemList, event) {
    // To overwrite
  },
  
  /**
   * Handler for double clicking the suggestion items
   */
  itemDbClickHandler :function(index, itemList, event) {
    // To overwrite
  },
  
  /**
   * Handler for navigating the items by up and down keys.
   */
  keyNavigateHandler :function(index, itemList) {
    // To overwrite
  },
  
  /**
   * Bind the events to the suggestion box
   */
  bindSuggestionBoxEvents : function(){
    //To overwrite
  },
  
  /**
   * unBind the events of the suggestion box
   */
  unBindSuggestionBoxEvents : function(){
    //To overwrite
  },
  
  /**
   * Get the selected item's value
   * @Param index The index of the selected item
   */
  getSelectedItemValue : function(index) {
    // To overwrite
  }
});

/**
 * Suggestion Box for link suggestion
 */
autosuggestion.LinkSuggestionBox = Class.create(autosuggestion.SuggestionBox,{
  /** The title for link suggestion */ 	
  title : "Link Suggestions:",
  /** The page results */ 	
  pageItemValues : null,
  /** The attachment results */ 	
  attachmentItemValues : null,
  
  /*linkHtmlTemplate : '<div id="suggestion_wikipage">'
  +'</div>'
  +'<div id="suggestion_attachment">'
  +'</div>',*/
  
  /**
   * Initialization: Add the Containers for pages and attachments results
   */
  initialize : function($super, results, position, size, editor) {
    $super(position, size, editor);
    $("suggestion_title").update(this.title);
    this.pageItemValues = results.get('pages');
    this.attachmentItemValues = results.get('attachments');
  },
  
  /** @Overwrite */
  showSuggestions : function(results, position, size) {
    if(this.isDestroyed()){
      return;
    }
    this.pageItemValues = results.get('pages');
    this.attachmentItemValues = results.get('attachments');
    if(this.pageItemValues == null && this.attachmentItemValues == null) {
      this.destroy();
      return;
    }
	
    // Clear the existed suggestion list
    this.unBindSuggestionBoxEvents(); 
    if($("suggestion_wikipage")) $("suggestion_wikipage").remove();
    if($("suggestion_attachment")) $("suggestion_attachment").remove();
	
    // Update the position and the size of suggestion box
    this.updatePosition(position, size);
    // Reset the index to -1, no item selected
    this.index = -1;

    if(this.pageItemValues != null) {
      // Show the attachment results
      this._showPageSuggestions();
    }
	
    if(this.attachmentItemValues != null) {
      // Show the attachment results
      this._showAttachmentSuggestions();
    }
	
    this.bindSuggestionBoxEvents(); 
  },
  
  /**
   * Show the page results
   */
  _showPageSuggestions : function() {
    if(this.pageItemValues == null) {
      return;
    }
    var suggestion_wikipage = new Element('div', {'id' : 'suggestion_wikipage'});
    $("suggestion_resultList").insert({top: suggestion_wikipage});
	
    this.pageItemValues.each(function(obj, index){
      var pageDiv = new Element('div', {'class' : 'pageItem'});		
      var titleDiv = new Element('div', {'class' : 'pageItemTitle'}); 
      titleDiv.insert(obj);
      	  
      var fullNameDiv = new Element('div', {'class' : 'pageItemFullname'}); 
      fullNameDiv.insert(index+"."+obj);
      	  
      pageDiv.appendChild(titleDiv);
      pageDiv.appendChild(fullNameDiv);
      suggestion_wikipage.appendChild(pageDiv);
      suggestion_wikipage.scrollTop = 0;
    })
  },
  
  /**
   * Show the attachment results
   */
  _showAttachmentSuggestions : function() {
    var suggestion_attachment = new Element('div', {'id' : 'suggestion_attachment'});
    $("suggestion_resultList").insert({bottom: suggestion_attachment});
    var thisObj =  this;
    this.attachmentItemValues.each(function(obj, index){
      var attachmentDiv = new Element('div', {'class' : 'attachmentItem'});		
      var titleDiv = new Element('div', {'class' : 'attachmentItemTitle'});		 
      titleDiv.insert(obj);
	  
      attachmentDiv.appendChild(titleDiv);		
      suggestion_attachment.appendChild(attachmentDiv);
      suggestion_attachment.scrollTop = 0;
    })
  },  
  
  /** @Overwrite */
  itemClickHandler : function(index, itemList){
    this.index = index;
    itemList.each(function(obj) {
      obj.removeClassName("itemSelected")
    });
  },
  
  /** @Overwrite */
  itemDbClickHandler : function(index, itemList){
    this.index = index;
    var results = this.pageItemValues.concat(this.attachmentItemValues);
    console.debug("selected item value:" + results[index]);
    document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:results[index]});
    this.destroy();// todo: this.destroy()
  },
  
  /** @Overwrite */
  keyNavigateHandler : function(index, itemList){
    var titleContainerHeight = $("suggestion_title").getHeight(); 
    var pageContainerHeight = $("suggestion_wikipage") == null ? 0 : $("suggestion_wikipage").getHeight();
    //console.debug("pageContainerHeight:"+pageContainerHeight);
    var attachmentContainerHeight = $("suggestion_attachment") == null ? 0 : $("suggestion_attachment").getHeight();
    //console.debug("attachmentContainerHeight:"+attachmentContainerHeight);
    var pageItemValuesLength = this.pageItemValues == null ? 0 : this.pageItemValues.length;
    var attachmentItemValuesLength = this.attachmentItemValues == null ? 0 : this.attachmentItemValues.length;
	
    var selectedItem = itemList[index];
    var relativeTop = selectedItem.positionedOffset().top - titleContainerHeight;	
	
    if(this.pageItemValues && index < pageItemValuesLength) {
      var scrollTop = $("suggestion_wikipage").scrollTop;
      //console.debug("wikipage_relativeTop:"+relativeTop)
      //console.debug("wikipage_scrollTop:"+scrollTop)
      if(relativeTop <= scrollTop) {
 	$("suggestion_wikipage").scrollTop -= scrollTop - relativeTop;
      }
      if(relativeTop + selectedItem.getHeight() >= pageContainerHeight+scrollTop) {
  	$("suggestion_wikipage").scrollTop += relativeTop - (pageContainerHeight+scrollTop) + selectedItem.getHeight();
      }
    }
	
    if(this.attachmentItemValues &&  index >= pageItemValuesLength) {
      if(index == pageItemValuesLength) {
  	$("suggestion_attachment").scrollTop = 0;
      }
      var scrollTop = $("suggestion_attachment").scrollTop;
      //console.debug("attachment_scrollTop:"+scrollTop)
      relativeTop = relativeTop - pageContainerHeight;
      //console.debug("attachment_relativeTop:"+relativeTop)
      if(relativeTop <= scrollTop) {
	$("suggestion_attachment").scrollTop -= scrollTop - relativeTop;
      }
      if(relativeTop + selectedItem.getHeight() >=attachmentContainerHeight+scrollTop) {
	$("suggestion_attachment").scrollTop += relativeTop - (attachmentContainerHeight+scrollTop) + selectedItem.getHeight();
      }
    }
	
    if(this.index >= 0){
      itemList[this.index].removeClassName("itemSelected");
    }
    itemList[index].addClassName("itemSelected");
    this.index = index;
    return false;
  },
  
  /**
   * @Overwrite
   * Bind the events to the suggestion box when the suggestion box is shown
   */
  bindSuggestionBoxEvents : function(){
    var itemList = this._concatItems();
	
    this.onKeyNavigateBound = this.onKeyNavigate.bind(this, itemList);
    this.editor.obj.observe("keydown", this.onKeyNavigateBound);
    // Listen to the click and dbclick events;
    for(var i=0; i < itemList.length; i++){
      itemList[i].observe("click", this.onItemClick.bind(this, i, itemList));
      itemList[i].observe("dblclick", this.onItemDbClick.bind(this, i, itemList));
    }
  },
  
  _concatItems : function() {
    var pageItemList = $$("#suggestion_wikipage div.pageItem");
    var attachmentItemList = $$("#suggestion_attachment div.attachmentItem");
    return pageItemList.concat(attachmentItemList);
  },
  
  /**
   * @Overwrite
   * Unbind the events of the suggestion box when the suggestion box is destroyed
   */
  unBindSuggestionBoxEvents : function(){
    var itemList = this._concatItems();
	
    this.editor.obj.stopObserving("keydown", this.onKeyNavigateBound);
    // Stop listening to the suggestion list
    for(var i=0; i < itemList.length; i++){
      itemList[i].stopObserving('click');
      itemList[i].stopObserving('dblclick');
    }
  },
  
  /** @Overwrite */
  getSelectedItemValue : function(index){
    if(index < this.pageItemValues.length) {
      return this.pageItemValues[index];
    } else {
      return this.attachmentItemValues[index];
    }
  }
});

/**
 * Suggestion Box for image suggestion
 */
autosuggestion.ImageSuggestionBox = Class.create(autosuggestion.SuggestionBox,{
/** The title for link suggestion */
  title : "Image Suggestions:",
  /** The page results */
  imageItemValues : null,

  /*ImageHtmlTemplate : '<div id="suggestion_images">'
  +'</div>'*/

  /**
   * Initialization: Add the Containers for pages and attachments results
   */
  initialize : function($super, results, position, size, editor) {
    $super(position, size, editor);
    $("suggestion_title").update(this.title);
    this.imageItemValues = results;
  },

  /**
   * @Overwrite
   * Also remove the image perviewer.
   */
  destroy : function($super) {
    $super();
    if($("suggestion_imagePreview") != null) {
      $("suggestion_imagePreview").remove();
    }
  }, 

  /** @Overwrite */
  showSuggestions : function(results, position, size) {
    if(this.isDestroyed()){
      return;
    }
    this.imageItemValues = results;
    if(this.imageItemValues == null) {
      this.destroy();
      return;
    }

    // Clear the existed suggestion list
    this.unBindSuggestionBoxEvents();
    if($("suggestion_images")) $("suggestion_images").remove();

    // Update the position and the size of suggestion box
    this.updatePosition(position, size);
    // Reset the index to -1, no item selected
    this.index = -1;

    if(this.imageItemValues != null) {
      // Show the attachment results
      this._showImageSuggestions();
    }

    this.bindSuggestionBoxEvents();
  },
  
  /**
   * Show the page results
   */
  _showImageSuggestions : function() {
    if(this.imageItemValues == null) {
      return;
    }
    var suggestion_images = new Element('div', {'id' : 'suggestion_images'});
    $("suggestion_resultList").insert({top: suggestion_images});

    this.imageItemValues.each(function(obj, index){
      var imageDiv = new Element('div', {'class' : 'imageItem'});

      var snapshotDiv = new Element('div', {'class' : 'imageSnapshot'});
      imageDiv.appendChild(snapshotDiv);
      var imageSnapshot = new Element('img', {'src': obj.url, 'class' : 'imageSnapshotSize'})
      snapshotDiv.appendChild(imageSnapshot);

      var descriptionDiv = new Element('div', {'class' : 'imageDescription'});
      imageDiv.appendChild(descriptionDiv);

      var titleDiv = new Element('div', {'class' : 'imageItemTitle'});
      titleDiv.insert(obj.title);

      var fullNameDiv = new Element('div', {'class' : 'imageItemFullname'});
      fullNameDiv.insert(obj.fullname);

      descriptionDiv.appendChild(titleDiv);
      descriptionDiv.appendChild(fullNameDiv);

      var clearDiv = new Element('div', {'style' : 'clear:both'});
      imageDiv.appendChild(clearDiv)

      suggestion_images.appendChild(imageDiv);
      suggestion_images.scrollTop = 0;
    })
  },
  
  /**
   * Show the image Preview of the selected image
   */
  _showImagePreview : function() {
    var imagePreview = $("suggestion_imagePreview");
    if(this.index == -1 && imagePreview != null) {
      imagePreview.remove();
      return;
    }
    if(imagePreview == null) {
      var top = this.position.top + $("suggestion_title").getHeight();
      var left = this.position.left + $("suggestion_box_container").getWidth();
      var height = $("suggestion_resultList").getHeight() - $("suggestion_title").getHeight();
      imagePreview = new Element('div', {'id' : 'suggestion_imagePreview', 'style':'top:'+ top +'px; left:'+ left +'px; height:'+ height +'px'});
      document.body.appendChild(imagePreview);
    }
    var imageObj = this.imageItemValues[this.index];
    imagePreview.update("<img src='"+ imageObj.url +"'/>");
  },  

  /** @Overwrite */
  itemClickHandler : function(index, itemList){
    this.index = index;
    itemList.each(function(obj) {
      obj.removeClassName("itemSelected")
    });
    this._showImagePreview();
  },

  /** @Overwrite */
  itemDbClickHandler : function(index, itemList){
    this.index = index;
    console.debug("selected item value:" + this.imageItemValues[index]);
    document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:this.imageItemValues[index]});
    this.destroy();// todo: this.destroy()
  },

  /** @Overwrite */
  keyNavigateHandler : function(index, itemList){
    var titleContainerHeight = $("suggestion_title").getHeight();
    var imageContainerHeight = $("suggestion_images") == null ? 0 : $("suggestion_images").getHeight();
    //console.debug("imageContainerHeight:"+imageContainerHeight);
    var imageItemValuesLength = this.imageItemValues == null ? 0 : this.imageItemValues.length;

    var selectedItem = itemList[index];
    var relativeTop = selectedItem.positionedOffset().top - titleContainerHeight;

    if(this.imageItemValues && index < imageItemValuesLength) {
      var scrollTop = $("suggestion_images").scrollTop;
      //console.debug("wikipage_relativeTop:"+relativeTop)
      //console.debug("wikipage_scrollTop:"+scrollTop)
      if(relativeTop <= scrollTop) {
        $("suggestion_images").scrollTop -= scrollTop - relativeTop;
      }
      if(relativeTop + selectedItem.getHeight() >= imageContainerHeight+scrollTop) {
        $("suggestion_images").scrollTop += relativeTop - (imageContainerHeight+scrollTop) + selectedItem.getHeight();
      }
    }

    if(this.index >= 0){
      itemList[this.index].removeClassName("itemSelected");
    }
    itemList[index].addClassName("itemSelected");
    this.index = index;  
    this._showImagePreview();
    return false;
  },

  /**
   * @Overwrite
   * Bind the events to the suggestion box when the suggestion box is shown
   */
  bindSuggestionBoxEvents : function(){
    var itemList = $$("#suggestion_images div.imageItem");

    this.onKeyNavigateBound = this.onKeyNavigate.bind(this, itemList);
    this.editor.obj.observe("keydown", this.onKeyNavigateBound);
    // Listen to the click and dbclick events;
    for(var i=0; i < itemList.length; i++){
      itemList[i].observe("click", this.onItemClick.bind(this, i, itemList));
      itemList[i].observe("dblclick", this.onItemDbClick.bind(this, i, itemList));
    }
  },

  /**
   * @Overwrite
   * Unbind the events of the suggestion box when the suggestion box is destroyed
   */
  unBindSuggestionBoxEvents : function(){
    var itemList = $$("#suggestion_images div.imageItem");

    this.editor.obj.stopObserving("keydown", this.onKeyNavigateBound);
    // Stop listening to the suggestion list
    for(var i=0; i < itemList.length; i++){
      itemList[i].stopObserving('click');
      itemList[i].stopObserving('dblclick');
    }
  },

  /** @Overwrite */
  getSelectedItemValue : function(index){
    if(index < this.imageItemValues.length) {
      return this.imageItemValues[index];
    } else {
      return null;
    }
  }

});

/**
 * Suggestion Box for macro suggestion
 */
autosuggestion.MacroSuggestionBox = Class.create(autosuggestion.SuggestionBox,{
});
// End XWiki augmentation.
return XWiki;
}(XWiki || {}));

// Init test tools for suggestion box.
document.observe('xwiki:dom:loaded', function() {
  var testLinkSuggestionBox = function(){
    var suggestionBox = null;
    var editor = $("content");
    var testBox = new Element('div', {'id' : 'testBox'});
    testBox.setStyle({"padding":"2px 0", "border":"1px solid #bebebe"});
    $("xwikitext").insert({top:testBox});
    testBox.insert("Page Results: <input type='text' id='pageResults' value='[\"page1\", \"page2\", \"page3\", \"page4\", \"page5\", \"page6\"]' size=80/><br/>"
                                 +"Attachment Results: <input type='text' id='attachmentResults' value='[\"attachment1\", \"attachment2\", \"attachment3\", \"attachment4\", \"attachment5\", \"attachment6\"]'  size=80/><br/>"
                                 +"top : <input type='text' id='boxtop' value='0' size=5/>px left : <input type='text' id='boxleft' value='0' size=5/>px<br/>"
                                 +"width : <input type='text' id='boxwidth' value='200' size=5/>px height : <input type='text' id='boxheight' value='400' size=5/>px<br/>"
                                 +"<input type='button' id='testshow' value='Show suggestion box'/> "
                                 +"<input type='button' id='testRemove' value='Remove suggestion box'/> ");

    $("testshow").observe("click", function(event){
      var pageResults = $("pageResults").value;
      if(pageResults == ""){
        pageResults = null;
      }else{
        pageResults = pageResults.evalJSON()
      }
      var attachmentResults = $("attachmentResults").value
      if(attachmentResults == ""){
        attachmentResults = null;
      }else{
        attachmentResults = attachmentResults.evalJSON()
      }
      var results = $H({"pages":pageResults, "attachments":attachmentResults})

      var editorOffset = editor.cumulativeOffset();
      //console.debug(document.viewport.getScrollOffsets());
      //console.debug(editor.cumulativeOffset());
      //console.debug(editor.cumulativeScrollOffset());
      //console.debug(editorOffset);
      var top = parseInt($("boxtop").value);
      var left = parseInt($("boxleft").value);
      var width = parseInt($("boxwidth").value);
      var height = parseInt($("boxheight").value);
      if(top<editorOffset.top || top>editorOffset.top+testBox.getHeight() || left<editorOffset.left || left>editorOffset.left+testBox.getWidth()){
        alert("The position of suggestion box must between top:"+editorOffset.top+" - "+(editorOffset.top+testBox.getHeight())+"  and left:"+editorOffset.left+" - "+(editorOffset.left+testBox.getWidth()));
        return;
      }
      if(suggestionBox == null || suggestionBox.isDestroyed()) {
        suggestionBox = new XWiki.autosuggestion.LinkSuggestionBox(results, {"top":top, "left":left}, {"width":width, "height":height}, {"type":"wiki", "obj":editor});
      }
      suggestionBox.showSuggestions(results, {"top":top, "left":left}, {"width":width, "height":height});
      editor.focus();
    })

    $("testRemove").observe("click", function(event){
      suggestionBox.destroy();
      suggestionBox = null;
    });

  }  

  // Test image suggestion box
  var testImageSuggestionBox = function() {
    var suggestionBox = null;
    var editor = $("content");
    var testBox = new Element('div', {'id' : 'testBox'});
    testBox.setStyle({"padding":"2px 0", "border":"1px solid #bebebe"});
    $("xwikitext").insert({top:testBox});
    testBox.insert("Image Results: <input type='text' id='imageResults' value='[{\"url\":\"http://farm6.static.flickr.com/5235/5852377601_b3f165b9d4_s.jpg\", \"title\":\"A nice picture1\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}, {\"url\":\"http://farm4.static.flickr.com/3074/5855874578_07df3ac848_s.jpg\", \"title\":\"A nice picture2\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}, {\"url\":\"http://farm6.static.flickr.com/5272/5864590841_78060e58ec_s.jpg\", \"title\":\"A nice picture3\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}, {\"url\":\"http://farm6.static.flickr.com/5160/5800480924_dab675815f_s.jpg\", \"title\":\"A nice picture4\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"},{\"url\":\"http://farm6.static.flickr.com/5238/5857007301_f482b99845_s.jpg\", \"title\":\"A nice picture5\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}]' size=80/><br/>"
				 +"top : <input type='text' id='boxtop' value='0' size=5/>px left : <input type='text' id='boxleft' value='0' size=5/>px<br/>"
				 +"width : <input type='text' id='boxwidth' value='300' size=5/>px height : <input type='text' id='boxheight' value='400' size=5/>px<br/>"
				 +"<input type='button' id='testshow' value='Show suggestion box'/> "
				 +"<input type='button' id='testRemove' value='Remove suggestion box'/> ");
  
    $("testshow").observe("click", function(event){	
      var imageResults = $("imageResults").value;
      if(imageResults == ""){
        imageResults = null;
      }else{
        imageResults = imageResults.evalJSON()
      }
      var results = imageResults
	
      var editorOffset = editor.cumulativeOffset();
      //console.debug(document.viewport.getScrollOffsets());
      //console.debug(editor.cumulativeOffset());
      //console.debug(editor.cumulativeScrollOffset());
      //console.debug(editorOffset);
      var top = parseInt($("boxtop").value);
      var left = parseInt($("boxleft").value);
      var width = parseInt($("boxwidth").value);
      var height = parseInt($("boxheight").value);
      if(top<editorOffset.top || top>editorOffset.top+testBox.getHeight() || left<editorOffset.left || left>editorOffset.left+testBox.getWidth()){
        alert("The position of suggestion box must between top:"+editorOffset.top+" - "+(editorOffset.top+testBox.getHeight())+"  and left:"+editorOffset.left+" - "+(editorOffset.left+testBox.getWidth()));
        return;
      }
      if(suggestionBox == null || suggestionBox.isDestroyed()) {
        suggestionBox = new XWiki.autosuggestion.ImageSuggestionBox(results, {"top":top, "left":left}, {"width":width, "height":height}, {"type":"wiki", "obj":editor});
      }  
      suggestionBox.showSuggestions(results, {"top":top, "left":left}, {"width":width, "height":height});
      editor.focus();
    })
  
    $("testRemove").observe("click", function(event){
      suggestionBox.destroy();
      suggestionBox = null;
    });
  }
  testLinkSuggestionBox();
  //testImageSuggestionBox();
});
