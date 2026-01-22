//$Id$
//  ******JS 2.0******     New Signin second cut functions added  /
var signinathmode = "lookup";//No i18N
var reload_page ="";
var isFormSubmited = isPasswordless = isSecondary = isPrimaryDevice = isTroubleSignin = isRecovery = isCountrySelected = isFaceId = isPrimaryMode = isEmailVerifyReqiured = triggeredUser = isShowEnableMore = isLdapVisible = oaNotInstalled = mfaBanner = isOauPopupClosed = domainverification = hiddenCountrycode = isArattaiSmsCodeSent = false;
var allowedmodes,digest,rmobile,zuid,temptoken,mdigest,deviceid,prefoption,devicename,emobile,deviceauthdetails,cdigest,isResend,redirectUri,secondarymodes,prev_showmode,qrtempId,mobposition,bioType,restrictTrustMfa,resendTimer,trustMfaDays,bannerTimer,oldsigninathmode,emailposition,recoverymodes,oneauthgrant,isSignupCaptcha,balanceBannerTime,bannerCount,resumeBannerIn,isBannerOnHold,isBannerHardPaused,bannerPosition,listofdomain,AMFA_edomain_resp, AMFA_rdomain_resp, selectedRegionalDC;
var callmode="primary";//no i18N
var oadevicepos = multiDCTriggered = numericEditCounts = 0;
var mzadevicepos = undefined;
var adminEmail;
var contactAdminHelpdoc = "";
var AMFAotpThreshold;
var MFAotpThresholdmob;
var resendcheck;
var prevoption;
var ppValidator;
function submitsignin(frm,event){
	if (event && typeof event.preventDefault === 'function') {	//no i18n
		event.preventDefault();
    }else if(window.event != undefined && typeof window.event.preventDefault === 'function'){	//no i18n
		window.event.preventDefault();
	}
	$(".signin_head .fielderror").removeClass("errorlabel");
	$(".signin_head .fielderror").text("");//no i18n
	if(isFormSubmited) {
		return false;
	}
	$("#nextbtn span").addClass("zeroheight");
	$("#nextbtn").addClass('changeloadbtn');
	$("#nextbtn").attr("disabled", true);
	if($('#totpverifybtn').is(":visible")){
		$('#totpverifybtn .loadwithbtn').show();
		$('#totpverifybtn .waittext').addClass('loadbtntext');
	}
	var isCaptchaNeeded = $("#captcha_container").is(":visible");
	var captchavalue = frm.captcha && frm.captcha.value.trim();
	if(isCaptchaNeeded){
		if(!isValid(captchavalue)) {
			showCommonError("captcha",I18N.get("IAM.SIGNIN.ERROR.CAPTCHA.REQUIRED"),true);//no i18n
			return false;
		}
		if( !(/^[a-zA-Z0-9]*$/.test( captchavalue )) ) {
			showCommonError("captcha",I18N.get("IAM.SIGNIN.ERROR.CAPTCHA.INVALID"),true);//no i18n
			return false;
		}
    }
	if(signinathmode === "lookup"){
		var LOGIN_ID = frm.LOGIN_ID.value.trim();
		if($("#portaldomain").is(":visible")){
			LOGIN_ID = LOGIN_ID+$(".domainselect").val(); 
		}
		if(!isValid(LOGIN_ID)) {
			var errorContent = emailOnlySignin ? "IAM.NEW.SIGNIN.ENTER.EMAIL.ADDRESS" : isMobilenumberOnly ? "IAM.NEW.SIGNIN.ENTER.MOBILE.NUMBER"  : "IAM.NEW.SIGNIN.ENTER.EMAIL.OR.MOBILE";//no i18n
			showCommonError("login_id",I18N.get(errorContent));//no i18n
			return false;
		}
		if(($(".showcountry_code").is(":visible") || $(".select_container--country_implement").is(":visible")) && !isPhoneNumber(LOGIN_ID)){
			showCommonError("login_id",I18N.get("IAM.PHONE.ENTER.VALID.MOBILE_NUMBER"));//no i18n
			return false;
		} 
		if(!hideCCode && emailOnlySignin && isPhoneNumber(LOGIN_ID.split("-")[1]?LOGIN_ID.split("-")[1]:LOGIN_ID.split("-")[0])){
			showCommonError("login_id",I18N.get("IAM.NEW.EMAIL.ERROR.INVALID"));//no i18n
			return false;
		}
		if(!isUserName(LOGIN_ID) && !isEmailIdSignin(LOGIN_ID) && !isPhoneNumber(LOGIN_ID.split('-')[1]) || isPhoneNumber(LOGIN_ID.split('-')[1]) && LOGIN_ID.split('-')[0].indexOf("+") != -1) {
			var errorContent = emailOnlySignin ? "IAM.NEW.SIGNIN.INVALID.LOOKUP.EMAIL" : isMobilenumberOnly ? "IAM.NEW.SIGNIN.INVALID.LOOKUP.MOBILE"  : "IAM.NEW.SIGNIN.INVALID.LOOKUP.IDENTIFIER";//no i18n
			showCommonError("login_id",I18N.get(errorContent));//no i18n
			return false;
		}
		if(isEmailId(LOGIN_ID))// to make it lower case 
		{
			LOGIN_ID=LOGIN_ID.toLowerCase();
		}
		LOGIN_ID = ($(".select_country_code").is(":visible") || $(".select_container--country_implement").is(":visible")) ? $( "#country_code_select" ).val().split("+")[1]+'-'+LOGIN_ID : LOGIN_ID;
		LOGIN_ID = isPhoneNumber(LOGIN_ID.split('-')[1]) ? LOGIN_ID.split('-')[0].trim() + "-" + LOGIN_ID.split('-')[1].trim() : LOGIN_ID.trim();
		var loginurl = uriPrefix +"/signin/v2/lookup/"+euc(LOGIN_ID) ;//: "/signin/v2/lookup/"+LOGIN_ID; //no i18N
		var encryptionJson = {
			path : loginurl,
			value : euc(LOGIN_ID)
		}
		var params = "mode=primary"+ "&" + signinParams; //no i18N
		if(isCaptchaNeeded){params += "&captcha=" +captchavalue+"&cdigest="+cdigest;}
		sendRequestWithCallback(loginurl, params ,true, handleLookupDetails,undefined, encryptionJson, euc(LOGIN_ID), true);
		return false;
	}else if(signinathmode === "passwordauth" || signinathmode === "ldappasswordauth"){//no i18N
		if(allowedmodes != undefined && allowedmodes.indexOf("yubikey") != -1 && !isWebAuthNSupported()){ 
			//if yubikey not supported in user's browser, block signin on first factor form and show not supported error
			showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
			changeButtonAction(I18N.get("IAM.NEXT"),false);
			return false;
		}
		var PASSWORD = frm.PASSWORD.value.trim();
		if(!isValid(PASSWORD)) {
			showCommonError("password",I18N.get("IAM.ERROR.ENTER_PASS")); //no i18n
			return false;
		}
		var jsonData = signinathmode === "passwordauth"?  {'passwordauth':{'password':PASSWORD }} : {'ldappasswordauth':{'password':PASSWORD }};//no i18n
		var encryptionJson = {
			path : signinathmode === "passwordauth"?  'passwordauth.password' : 'ldappasswordauth.password',//No I18N
			value : PASSWORD
		}
		var loginurl = signinathmode === "passwordauth"? uriPrefix + "/signin/v2/"+callmode+"/"+zuid+"/password?"  : uriPrefix + "/onpremise/signin/v2/"+callmode+"/"+zuid+"/ldappasswordauth?";//no i18N
		loginurl += "digest="+digest+ "&" + signinParams; //no i18N
		if(isCaptchaNeeded){loginurl += "&captcha=" +captchavalue+"&cdigest="+cdigest;}
		sendRequestWithCallback(loginurl,JSON.stringify(jsonData),true,handlePasswordDetails, undefined, encryptionJson, PASSWORD);
		return false;
		
	}else if(signinathmode === "totpsecauth" || (signinathmode==="oneauthsec" && prefoption==="ONEAUTH_TOTP") || signinathmode === "totpauth"){//no i18N
		if(isClientPortal){var TOTP = frm.TOTP.value.trim();}
		else{var TOTP = document.getElementById("mfa_totp").firstChild.value.trim();}
		if( !isValid(TOTP)){
			showCommonError("mfa_totp",I18N.get("IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.EMPTY"));//No I18N
			return false;
		}
		else if(TOTP.length!=totp_size){
			showCommonError("mfa_totp",I18N.get("IAM.ERROR.VALID.OTP"));//No I18N
			return false;
		}
		if( /[^0-9\-\/]/.test( TOTP ) ) {
			showCommonError("mfa_totp",I18N.get("IAM.SIGNIN.ERROR.INVALID.VERIFICATION.CODE"));//No I18N
			return false;
		}
		callmode = signinathmode === "totpauth" ? "primary" : "secondary";//no i18n
		var loginurl= prefoption==="ONEAUTH_TOTP" ? uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/oneauth/"+deviceid+"?": uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/totp?";//no i18N
		loginurl += "digest="+digest+ "&" + signinParams; //no i18N
		if(isCaptchaNeeded){loginurl += "&captcha=" +captchavalue+"&cdigest="+cdigest;}
		var jsonData = prefoption==="ONEAUTH_TOTP" ? {'oneauthsec':{'devicepref':prefoption,'code':TOTP }} : signinathmode === "totpauth" ? {'totpauth':{'code':TOTP }} :  {'totpsecauth':{'code':TOTP }};//no i18N
		var method = prefoption==="ONEAUTH_TOTP" ? "PUT": "POST";//NO i18N
		loginurl = prefoption==="ONEAUTH_TOTP" ? loginurl+"&polling="+false : loginurl; // no i18n
		var callback = signinathmode === "totpauth" ? handlePasswordDetails : handleTotpDetails; // no i18n
		sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,callback,method);
		return false;
	}else if(signinathmode === "otpsecauth"){//No I18N
		if(isClientPortal){var TFA_OTP_CODE = frm.MFAOTP.value.trim();}
		else{var TFA_OTP_CODE = $("#mfa_otp input:first-child").val() && $("#mfa_otp input:first-child").val().trim();}
		var errorfield = "mfa_otp"; // no i18n
		var incorrectOtpErr = I18N.get("IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.NEW");
		if(prev_showmode === "email"){
			if(isClientPortal){TFA_OTP_CODE = frm.MFAEMAIL.value.trim();}
			else{TFA_OTP_CODE = $("#mfa_email input:first-child").val() && $("#mfa_email input:first-child").val().trim();}
			errorfield = "mfa_email"; // no i18n
			incorrectOtpErr = I18N.get("IAM.NEW.SIGNIN.INVALID.EMAIL.MESSAGE.NEW");
		}
		if(!isValid(TFA_OTP_CODE)){
				showCommonError(errorfield,I18N.get("IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.EMPTY"));//No I18N
				return false;	
		}
		if(isNaN(TFA_OTP_CODE) || !isValidCode(TFA_OTP_CODE)) {
				showCommonError(errorfield,incorrectOtpErr);
				return false;
		}
		if( /[^0-9\-\/]/.test( TFA_OTP_CODE ) ) {
			showCommonError(errorfield,I18N.get("IAM.SIGNIN.ERROR.INVALID.VERIFICATION.CODE"));//No I18N
			return false;
		}
		var mode = prev_showmode === "email" ? "EMAIL" : "MOBILE"; // no i18N
		callmode="secondary";//no i18n
		var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/otp/"+emobile+"?";//no i18N
		loginurl += "digest="+digest+ "&" + signinParams; //no i18N
		if(isCaptchaNeeded){loginurl += "&captcha=" +captchavalue+"&cdigest="+cdigest;}
		var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
		var jsonData = isAMFA  ? { 'otpsecauth' : { 'mdigest' : mdigest, 'code' : TFA_OTP_CODE , 'isAMFA' : true , 'mode' : mode} } : { 'otpsecauth' : { 'mdigest' : mdigest, 'code' : TFA_OTP_CODE  , 'mode' : mode} } ;//no i18N
		sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleTotpDetails,"PUT");//no i18n
		return false;
	}else if(signinathmode === "otpauth" || signinathmode === "arotpauth" ){ //no i18n 
		if(isClientPortal){var OTP_CODE = frm.OTP.value.trim();}
		else{var OTP_CODE = document.getElementById("otp").firstChild.value.trim();}
		if(allowedmodes != undefined && allowedmodes.indexOf("yubikey") != -1 && !isWebAuthNSupported()){ 
			//if yubikey not supported in user's browser, block signin on first factor  form and show not supported error
			showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
			changeButtonAction(I18N.get("IAM.NEW.SIGNIN.VERIFY"),false);
			return false;
		}
		if(!isValid(OTP_CODE)){
				var emptyErrMsg = (typeof(isArattai) != "undefined" && isArattai) ? "IAM.ENTER.VERIFICATION.CODE" : "IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.EMPTY";// no i18n
				showCommonError("otp",I18N.get(emptyErrMsg));//No I18N
				return false;	
		}
		if(isNaN(OTP_CODE) || !isValidCode(OTP_CODE)) {
				var error_msg = prev_showmode === "email" ? I18N.get("IAM.NEW.SIGNIN.INVALID.EMAIL.MESSAGE.NEW") : (typeof(isArattai) != "undefined" && isArattai) ? I18N.get("IAM.SIGNIN.ERROR.INVALID.VERIFICATION.CODE") : I18N.get("IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.NEW"); // no i18n
				showCommonError("otp",error_msg);//no i18n
				return false;
		}
		if( /[^0-9\-\/]/.test( OTP_CODE ) ) {
			showCommonError("otp",I18N.get("IAM.SIGNIN.ERROR.INVALID.VERIFICATION.CODE"));//No I18N
			return false;
		}
		var mode = prev_showmode === "email" ? "EMAIL" : "MOBILE"; // no i18N
		var loginurl = uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/otp/"+emobile+"?";//no i18N
		loginurl += "digest="+digest+ "&" + signinParams; //no i18N
		if(isCaptchaNeeded){loginurl += "&captcha=" +captchavalue+"&cdigest="+cdigest;}
		var jsonData = { 'otpauth' : { 'code' : OTP_CODE, 'is_resend' : false  , 'mode' : mode} };//no i18N
		sendRequestWithCallback(loginurl,JSON.stringify(jsonData),true,handlePasswordDetails,"PUT");//no i18n
		return false;
	}
	else if(signinathmode=== "deviceauth" || signinathmode=== "devicesecauth"){ 
		var myzohototp;
		clearTimeout(oneauthgrant);
		if(prefoption==="totp"){
			if(isClientPortal){myzohototp = isTroubleSignin ? frm.MFATOTP.value.trim() : frm.TOTP.value.trim();}
			else{myzohototp = isTroubleSignin ? document.getElementById("verify_totp").firstChild.value.trim() : document.getElementById("mfa_totp").firstChild.value.trim();}
			if( !isValid(myzohototp)){
				var container = isTroubleSignin ? "verify_totp" : "mfa_totp"; // no i18n
				showCommonError(container,I18N.get("IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.EMPTY"));//No I18N
				return false;
			}
			else if(myzohototp.length!=totp_size){
				var container = isTroubleSignin ? "verify_totp" : "mfa_totp"; // no i18n
				showCommonError(container,I18N.get("IAM.ERROR.VALID.OTP"));//No I18N
				return false;
			}
		}
		var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/device/"+deviceid+"?";//no i18N
		loginurl += "digest="+digest+ "&" + signinParams; //no i18N
		isResend = prefoption === "push" ? true : false; // no i18N
		var jsonData = prefoption==="totp" ? {'devicesecauth':{ 'devicepref' : prefoption, 'code' : myzohototp } } :{'devicesecauth':{'devicepref':prefoption }}; ;//no i18N
		if(signinathmode === "deviceauth"){
			jsonData = prefoption==="totp" ? {'deviceauth':{ 'devicepref' : prefoption, 'code' : myzohototp } } :{'deviceauth':{'devicepref':prefoption }}; ;//no i18N
		}
		var method = "POST"; // no i18n
		var invoker = handleMyZohoDetails;
		if(prefoption==="totp"){
			method = "PUT"; // no i18n
			loginurl+= "&polling="+false; // no i18n
			invoker = handleTotpDetails;
		}
		sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,invoker,method);
		return false;
		//Resend push for myzohoapp
	}else if(signinathmode=== "oneauthsec"){ //No i18N   
		var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/oneauth/"+deviceid+"?";//no i18N
		loginurl += "digest="+digest+ "&" + signinParams; //no i18N
		var jsonData = {'oneauthsec':{'devicepref':prefoption }};//no i18N
		isResend= prefoption === "totp" || prefoption === "scanqr" ? false : true;// no i18N
		sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleOneAuthDetails);
		return false;
	}else if(signinathmode==="yubikeysecauth"){ //no i18n 
		clearCommonError("yubikey");//no i18N
		if(!isWebAuthNSupported()){
			showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
			return false;
		}
		var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/yubikey/self?"+signinParams;//no i18n
		sendRequestWithTemptoken(loginurl,"",true,handleYubikeyDetails);
		return false;
		//Resend Yubikey
	}else if(signinathmode == undefined){
		$("#nextbtn span").removeClass("zeroheight");
		$("#nextbtn").removeClass('changeloadbtn');
		$("#nextbtn").attr("disabled", false);
		if($('#totpverifybtn').is(":visible")){
			$('#totpverifybtn .loadwithbtn').hide();
			$('#totpverifybtn .waittext').removeClass('loadbtntext');
		}
		return false;
	}
	isFormSubmited = true;
	return false;
}
function sendRequestWithTemptoken(action, params, async, callback,method, encryptionpath, encryptionvalue) {
	triggerEncryption(params, encryptionpath, encryptionvalue).then(function(keyandvalue) {
		if (typeof contextpath !== 'undefined') {
			action = contextpath + action;
		}
		var objHTTP = xhr();
		objHTTP.open(method ? method : 'POST', action, async);
		objHTTP.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
		if (isValid(temptoken)) {
			objHTTP.setRequestHeader('Z-Authorization', 'Zoho-ticket ' + temptoken); // no i18n
		}
		if (keyandvalue && keyandvalue.key) {
			objHTTP.setRequestHeader('Waf-Encryption-Key', keyandvalue.key);
		}
		objHTTP.setRequestHeader('X-ZCSRF-TOKEN', csrfParam + '=' + euc(getCookie(csrfCookieName)));
		if (async) {
			objHTTP.onreadystatechange = function() {
				if (objHTTP.readyState == 4) {
					if (objHTTP.status === 0) {
						handleConnectionError();
						return false;
					}
					if (callback) {
						callback(objHTTP.responseText);
					}
				}
			};
		}
		objHTTP.send(keyandvalue.data);
		if (!async) {
			if (callback) {
				callback(objHTTP.responseText);
			}
		}
	});
} 
function showCommonError(field,message,skipReload){ 	
	$('.fielderror').val('');
	if($(".changeloadbtn").is(":visible")){
		var btnvalue = field==="login_id" ? I18N.get("IAM.NEXT") : field==="password" ? I18N.get("IAM.SIGN_IN") : I18N.get("IAM.NEW.SIGNIN.VERIFY"); //No i18n
		changeButtonAction(btnvalue,false);
	}
	if(!skipReload){
		if(field === "captcha" || field === "bcaptcha"){
			$("#bcaptcha_container").is(":visible") ? changeHip('bcaptcha_img','bcaptcha') : changeHip(); // no i18n
		}else{
			$("#captcha_container,#bcaptcha_container").hide();
			$("#captcha,#bcaptcha").val("");
		}
	}
	if($(".sendingotp").is(":visible")){
		$(".resendotp").removeClass("sendingotp").addClass("nonclickelem");
		$(".resendotp").text(I18N.get("IAM.NEW.SIGNIN.RESEND.OTP"));
	}
	var container=field+"_container";//no i18N
	$("#"+field).addClass("errorborder");
	$("#"+container+ " .fielderror").addClass("errorlabel");
	$("#"+container+ " .fielderror").html(message);
	$("#"+container+ " .fielderror").slideDown(200);
	$("#"+field).focus();
	if($('#totpverifybtn').is(":visible")){
		$('#totpverifybtn .loadwithbtn').hide();
		$('#totpverifybtn .waittext').removeClass('loadbtntext');
	}
	return false;
}
function callback_signin_lookup(msg) {
	showCommonError("login_id",msg);//No I18N
	$("#nextbtn span").removeClass("zeroheight");
	$("#nextbtn").removeClass("changeloadbtn");
	$("#nextbtn").attr("disabled", false);
	$("#nextbtn span").text(I18N.get("IAM.NEXT"));
	isFormSubmited = false;
	return false;
}
function changeButtonAction(textvalue,isSubmitted){
	$("#nextbtn span").removeClass("zeroheight");
	$("#nextbtn").removeClass("changeloadbtn");
	$("#nextbtn").attr("disabled", false);
	$("#nextbtn span").html(textvalue); //No I18N
	isFormSubmited = isSubmitted;
	return false;
}
function identifyEmailOrNum(login_id,encryptedMobile){
	var userLogin = isValid(login_id)? login_id : deviceauthdetails[deviceauthdetails.resource_name].loginid;
	if(isPhoneNumber(userLogin.split('-')[1]) || encryptedMobile){
		return "+"+userLogin.split('-')[0]+" "+userLogin.split('-')[1];
	}else{
		return userLogin;
	}
}
function validateAllowedMode(option,removeany){
	var optionToShow = {"enableMore" : false, "nootheroption" : true, "option": option}; // no i18n
	var fallBackOption = allowedmodes.slice();
	fallBackOption.splice(fallBackOption.indexOf(option),1);
	if(removeany){
		fallBackOption.splice(fallBackOption.indexOf(removeany),1);
	}
    var countOfMode = fallBackOption.length;
	fallBackOption.forEach(function (mode) {
	    if(mode == "jwt" || mode == "saml" || mode == "federated" || mode == "oidc"){
	    	countOfMode--;
	    }
	});
	if(countOfMode > 1){
		optionToShow.enableMore = true;
		isShowEnableMore = true;
		optionToShow.option = "";
	}
	if(countOfMode == 1){
		optionToShow.option = fallBackOption[0];
		optionToShow.nootheroption = false
	}
	return optionToShow;	
}
function appendSAML(count){
	var samlDisplayName = deviceauthdetails.lookup.modes.saml.data[count].display_name ? " - " + deviceauthdetails.lookup.modes.saml.data[count].display_name : "";
	var samlElement = document.createElement("span");
	samlElement.setAttribute("class", "saml_signin SAMLval_"+count);
	samlElement.setAttribute("title", "SAML"+samlDisplayName);
	if(isLargeFedIcons){
		samlElement.classList.add("large_box");	//No I18N
		samlElement.innerHTML = '<span class="icon-fsaml"></span><span class="saml-name">SAML'+samlDisplayName+'</span>';//no i18n	
	} else {
		samlElement.innerHTML = '<span class="icon-fsaml"></span>SAML'+samlDisplayName;//no i18n	
	}
	document.getElementById("fed_signin_options").appendChild(samlElement);
	$(".SAMLval_"+count).on("click", function(){
		redirectToSaml(deviceauthdetails.lookup.modes.saml.data[count]);
	});
}
function appendOIDC(count){
	var oidc_id = deviceauthdetails.lookup.modes.oidc.data[count].oidc_id;
	var DisplayName = deviceauthdetails.lookup.modes.oidc.data[count].display_name ? " - " + deviceauthdetails.lookup.modes.oidc.data[count].display_name : "";
	var elementToAppend = document.createElement("span");
	elementToAppend.setAttribute("class", "oidc_signin OIDCval_"+count);
	elementToAppend.setAttribute("title", "OpenID"+DisplayName);
	if(isLargeFedIcons){
		elementToAppend.classList.add("large_box");	//No I18N
		elementToAppend.innerHTML = '<span class="icon-openid"><span class="path1"></span><span class="path2"></span><span class="path3"></span></span><span class="openid-name">OpenID'+DisplayName+'</span>';//no i18n
	}else{
		elementToAppend.innerHTML = '<span class="icon-openid"><span class="path1"></span><span class="path2"></span><span class="path3"></span></span>OpenID'+DisplayName;//no i18n	
	}
	document.getElementById("fed_signin_options").appendChild(elementToAppend);
	$("#fed_signin_options .OIDCval_"+count).on("click", function(){
		enableOIDCAuth(oidc_id)
	});
}
function appendJWT(count){
	var redirectURI = deviceauthdetails.lookup.modes.jwt.data[count].redirect_uri;
	var DisplayName = deviceauthdetails.lookup.modes.jwt.data[count].display_name ? " - " + deviceauthdetails.lookup.modes.jwt.data[count].display_name : "";
	var elementToAppend = document.createElement("span");
	elementToAppend.setAttribute("class", "jwt_signin JWTval"+count);
	elementToAppend.setAttribute("title", "JWT"+DisplayName);
	if(isLargeFedIcons){
		elementToAppend.classList.add("large_box");	//No I18N
		elementToAppend.innerHTML = '<span class="icon-jwt_d"><span class="path1"></span><span class="path2"></span><span class="path3"></span><span class="path4"></span><span class="path5"></span><span class="path6"></span></span><span class="jwt-name">JWT'+DisplayName+'</span>';//no i18n
	}else{
		elementToAppend.innerHTML = '<span class="icon-jwt_d"><span class="path1"></span><span class="path2"></span><span class="path3"></span><span class="path4"></span><span class="path5"></span><span class="path6"></span></span>JWT'+DisplayName;//no i18n	
	}
	document.getElementById("fed_signin_options").appendChild(elementToAppend);
	$("#fed_signin_options .JWTval"+count).on("click", function(){
		switchto(redirectURI);
	});
}
function enableOIDCAuth(OIDCId){
	OIDCId = OIDCId === undefined ? deviceauthdetails.lookup.modes.oidc.data[0].oidc_id : OIDCId;
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/oidcauth/"+OIDCId+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	sendRequestWithTemptoken(loginurl,"",true,handleOIDCAuthdetails);
	return false;
}
function handleOIDCAuthdetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		switchto(jsonStr.oidcauth.redirect_uri);
	}else{
		showTopErrNotification(I18N.get("IAM.ERROR.GENERAL"));
		return false;
	}
}
function enableSamlAuth(samlAuthDomain){
	var login_id = deviceauthdetails.lookup.loginid;
	samlAuthDomain = samlAuthDomain === undefined ? deviceauthdetails.lookup.modes.saml.data[0].auth_domain : samlAuthDomain;
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/samlauth/"+samlAuthDomain+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	var jsonData = {'samlauth':{'login_id':login_id }};//no i18N
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleSamlAuthdetails);
	return false;
}
function handleSamlAuthdetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		if(jsonStr.samlauth.method == 1 && isValid(jsonStr.samlauth.redirect_uri) && isValid(jsonStr.samlauth.RelayState) && isValid(jsonStr.samlauth.SAMLRequest)){
				var form = document.createElement("form");
				form.setAttribute("id", "samlform");
				form.setAttribute("method", "POST");
			    form.setAttribute("action", jsonStr.samlauth.redirect_uri);
			    form.setAttribute("target", "_self");
				var RelayState = document.createElement("input");
				var SAMLRequest = document.createElement("input");
				
				RelayState.setAttribute("type", "hidden");
				RelayState.setAttribute("name", "RelayState");
				RelayState.setAttribute("value", jsonStr.samlauth.RelayState);
		        
				SAMLRequest.setAttribute("type", "hidden");
				SAMLRequest.setAttribute("name", "SAMLRequest");
				SAMLRequest.setAttribute("value", jsonStr.samlauth.SAMLRequest); 
				
				form.appendChild(RelayState);
				form.appendChild(SAMLRequest);
			   	document.documentElement.appendChild(form);
			  	form.submit();
			  	return false;
		}else{
			switchto(jsonStr.samlauth.redirect_uri);
		}
	}else{
		showTopErrNotification(I18N.get("IAM.ERROR.GENERAL"));
		return false;
	}
}
function enableOTP(enablemode) {
	showAndGenerateOtp(enablemode);
	return false;
}
function enableMfaField(mfamode){
	callmode="secondary";//no i18N
	if(mfamode==="totp"){
		$("#password_container,#captcha_container,.fed_2show,#otp_container").hide();
		$("#headtitle").text(I18N.get("IAM.NEW.SIGNIN.TOTP"));
		$(".service_name").text(I18N.get("IAM.NEW.SIGNIN.MFA.TOTP.HEADER"));
		$(".product_text,.product_head,.MAppIcon,.OnaAuthHLink,.pwless_head,.pwless_text").hide();
		$("#product_img").removeClass($("#product_img").attr('class'));
		$("#product_img").addClass("tfa_totp_mode")
		mfaBanner = true;
		$("#forgotpassword").hide();
		$("#nextbtn span").removeClass("zeroheight");
		$("#nextbtn").removeClass("changeloadbtn");
		$("#nextbtn").attr("disabled", false);
		$("#nextbtn span").text(I18N.get("IAM.NEW.SIGNIN.VERIFY"));
		if(!isClientPortal){enableSplitField("mfa_totp",totp_size,I18N.get("IAM.NEW.SIGNIN.VERIFY.CODE"))}
		$("#mfa_totp_container").show();
		$(".service_name").addClass("extramargin");
		if(isClientPortal){$('#mfa_totp').focus()}else{setTimeout(function() {$('#mfa_totp').click()},100)}
		isFormSubmited = false;
		callmode="secondary";//no i18n
		goBackToProblemSignin();
		signinathmode = "totpsecauth";//No i18N
	}else if(mfamode==="otp"){//No i18N
		MFAotpThresholdmob=3;
		$("#password_container,#captcha_container,.fed_2show,#otp_container").hide();
		var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
		var headTitle = isAMFA ? I18N.get("IAM.AC.CHOOSE.OTHER_MODES.MOBILE.HEADING") : I18N.get("IAM.NEW.SIGNIN.SMS.MODE");
		$("#headtitle").text(headTitle);
		if(isRecovery){
			$("#headtitle").prepend( "<span class='icon-backarrow backoption recbackop'></span>" );
			$(".recbackop").on("click",function(){
				hideCantAccessDevice(this);
			});
		}
		var descMsg = formatMessage(I18N.get("IAM.NEW.SIGNIN.OTP.HEADER"),rmobile);
		descMsg = isAMFA ? descMsg +"<br>"+ formatMessage(I18N.get("IAM.NEW.SIGNIN.WHY.VERIFY"),suspisious_login_link) : descMsg;
		$(".service_name").html(descMsg);
		$("#product_img").removeClass($("#product_img").attr('class'));
		$("#product_img").addClass("tfa_otp_mode");
		mfaBanner = true;
		showTopNotification(formatMessage(I18N.get("IAM.NEW.SIGNIN.OTP.SENT"),rmobile));

		if(!isClientPortal){enableSplitField("mfa_otp",otp_length,I18N.get("IAM.VERIFY.CODE"))}

		$("#mfa_otp_container,#mfa_otp_container .textbox_actions").show();//no i18N
		$("#forgotpassword").hide();
		$(".service_name").addClass("extramargin");
		$("#nextbtn span").removeClass("zeroheight");
		$("#nextbtn").removeClass("changeloadbtn");
		$("#nextbtn").attr("disabled", false);
		$("#nextbtn span").text(I18N.get("IAM.NEW.SIGNIN.VERIFY"));
		if(isClientPortal){$('#mfa_otp').focus()}else{setTimeout(function() {$('#mfa_otp').click()},100)}
		isFormSubmited = false;
		$(".resendotp").show();
		goBackToProblemSignin();
		callmode="secondary";//no i18n
		signinathmode = "otpsecauth";//No i18N
	}
	$(".loader,.blur").hide();
	if (!isRecovery) {allowedModeChecking();}
	return false;
}
function enableMyZohoDevice(jsonStr,trymode)
{
	clearTimeout(oneauthgrant);
	jsonStr = isValid(jsonStr) ? jsonStr : deviceauthdetails;
	signinathmode = jsonStr.resource_name;
	var devicedetails = jsonStr[signinathmode].modes.mzadevice.data[parseInt(mzadevicepos)];
	prefoption = trymode ? trymode : devicedetails.prefer_option;
	devicename = devicedetails.device_name;
	deviceid= devicedetails.device_id;
	isSecondary = allowedmodes.length > 1  && (allowedmodes.indexOf("recoverycode") === -1 && allowedmodes.indexOf("passphrase") === -1 )? true : false;
	isSecondary = (allowedmodes.length > 2 && allowedmodes.indexOf("recoverycode") === -1 && allowedmodes.indexOf("passphrase") === -1) ? true : isSecondary; // no i18n
	isSecondary = (allowedmodes.indexOf("recoverycode") === -1 && allowedmodes.indexOf("passphrase") === -1) && allowedmodes.length === 3 ? false : isSecondary;
	bioType = devicedetails.bio_type;
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/device/"+deviceid+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA
	var jsonData = callmode==="primary" ? {'deviceauth':{'devicepref':prefoption }}: {'devicesecauth':{'devicepref':prefoption }};//no i18N
	jsonData =  callmode !="primary" && isAMFA ? {'devicesecauth':{'devicepref':prefoption, 'isAMFA' : true }}  : jsonData; // no i18n
	if(typeof device_validity_token !== "undefined" && isValid(device_validity_token)){
		jsonData = callmode==="primary" ? {'deviceauth':{'devicepref':prefoption , "verify_device_token" : device_validity_token}}: {'devicesecauth':{'devicepref':prefoption , "verify_device_token" : device_validity_token}};//no i18N
		jsonData =  callmode !="primary" && isAMFA ? {'devicesecauth':{'devicepref':prefoption, 'isAMFA' : true, "verify_device_token" : device_validity_token }}  : jsonData; // no i18n
	}
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleMyZohoDetails);
	signinathmode = callmode==="primary" ?"deviceauth":"devicesecauth";//no i18N
	return false;
}function enableOneauthDevice(jsonStr,index){
	index = isValid(index) ? index : parseInt(oadevicepos);
	jsonStr = isValid(jsonStr) ? jsonStr : deviceauthdetails;
	var devicedetails = jsonStr[deviceauthdetails.resource_name].modes.oadevice.data[index];
	deviceid= devicedetails.device_id;
	prefoption = devicedetails.prefer_option;
	isFaceId =devicedetails.isFaceid;
	devicename = devicedetails.device_name;
	if(prefoption==="ONEAUTH_TOTP"){
		enableTOTPdevice(jsonStr,false,true);
		return false;
	}
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/oneauth/"+deviceid+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	var jsonData = {'oneauthsec':{'devicepref':prefoption }};//no i18N
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleOneAuthDetails);
	signinathmode = "oneauthsec";//no i18N
	return false;
}
function enableYubikeyDevice(jsonStr){
	signinathmode = jsonStr.resource_name;
	if(!isWebAuthNSupported()){
		showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
		return false;
	}
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/yubikey/self?"+signinParams;//no i18n
	isSecondary =  allowedmodes.length >1 && allowedmodes.indexOf("recoverycode") === -1 ? true : false; // no i18n
	sendRequestWithTemptoken(loginurl,"",true,handleYubikeyDetails);
	signinathmode = "yubikeysecauth";//no i18n
	if (!isRecovery) {allowedModeChecking();}
	return false;
}
function enableTOTPdevice(resp,isMyZohoApp,isOneAuth){
	!isPasswordless ? $(".hellouser").hide() : "";
	$("#password_container,#login_id_container,#captcha_container,.fed_2show,#otp_container").hide();
	$("#headtitle").text(I18N.get("IAM.NEW.SIGNIN.TOTP"));
	$(".service_name").text(I18N.get("IAM.NEW.SIGNIN.MFA.TOTP.HEADER"));
	$(".product_text,.product_head,.MAppIcon,.OnaAuthHLink,.pwless_head,.pwless_text").hide();
	$("#product_img").removeClass($("#product_img").attr('class'));
	$("#product_img").addClass("tfa_totp_mode");
	$("#forgotpassword").hide();
	$("#nextbtn span").removeClass("zeroheight");
	$("#nextbtn").removeClass("changeloadbtn");
	$("#nextbtn").attr("disabled", false);
	$("#nextbtn span").text(I18N.get("IAM.NEW.SIGNIN.VERIFY"));
	$("#nextbtn").show();
	if(isMyZohoApp){
		$(".deviceparent .devicetext").text(devicename);
		$(".devicedetails .devicetext").text(devicename);
		$("#mfa_device_container").show();
		$(".tryanother").show();
		var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
		if(isAMFA){
			allowedModeChecking();
			$(".tryanother").hide()
		}
		$(".service_name").text(I18N.get("IAM.NEW.SIGNIN.TOTP.HEADER"));
		$("#problemsignin,#recoverybtn,.loader,.blur,.deviceparent").hide();
		clearCommonError("mfa_totp"); // no i18n
		$('.signin_container').removeClass('mobile_signincontainer');
	}	
	else if(isOneAuth){ $(".service_name").text(I18N.get("IAM.NEW.SIGNIN.TOTP.HEADER"));}
	$('#mfa_totp').val("");
	if(!isClientPortal){enableSplitField("mfa_totp",totp_size,I18N.get("IAM.NEW.SIGNIN.VERIFY.CODE"))}
	$("#mfa_totp_container").show();
	if(isClientPortal){$("#mfa_totp").focus()}else{$("#mfa_totp").click()}
	$(".service_name").addClass("extramargin");
	isFormSubmited = false;
	var mzauth = callmode ==="primary" ?"deviceauth":"devicesecauth";//no i18N
	signinathmode = isMyZohoApp ? mzauth : "oneauthsec";//No i18N
	if(!isMyZohoApp && !isRecovery){allowedModeChecking()};
	return false;
}
function enableOneAuthBackup(){
	changeRecoverOption(allowedmodes[0]);
	$('#backup_container .backoption,#recovery_passphrase,#recovery_backup').hide();
	allowedmodes.indexOf("passphrase") != -1 ? $('#recovery_passphrase').show() : $('#recovery_passphrase').hide();
	allowedmodes.indexOf("recoverycode") != -1 ? $('#recovery_backup').show() : $('#recovery_backup').hide();
} // no i18n
function handleYubikeyDetails(resp){ // no i18n
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp); // no i18n
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			if(successCode==="SI203"){
				$(".loader,.blur").hide();
				$(".waittext").css("waittext","25px"); //no i18n
			   	showYubikeyDetails();
			   	getAssertion(jsonStr.yubikeysecauth);
			}	
		}
		else{
			if(jsonStr.cause==="throttles_limit_exceeded"){
				showCommonError("yubikey",jsonStr.localized_message); //no i18n
				if(!($("#yubikey_container").is(":visible"))){
					showYubikeyDetails();
					showError();
					$("#yubikey_container").show();
					if($(".blur,.loader").is(":visible")){
						$(".blur,.loader").hide();
					}
				}
				return false;
			}
			showCommonError("password",jsonStr.localized_message); //no i18n
			return false;
		}
		return false;
	   	
	}else{
		 var errorcontainer = signinathmode ==="passwordauth"? "password":"login_id";//no i18n
		 showCommonError(errorcontainer,I18N.get(jsonStr.localized_message)); //no i18n
		return false;	
	}
	return false;
}

function getAssertion(parameters) {
	var requestOptions = {};
	requestOptions.challenge = strToBin(parameters.challenge);
	requestOptions.timeout = parameters.timeout;
	requestOptions.rpId = parameters.rpId;
	requestOptions.allowCredentials = credentialListConversion(parameters.allowCredentials);
	if ('authenticatorSelection' in parameters) {
      requestOptions.authenticatorSelection = parameters.authenticatorSelection;
    }
	requestOptions.extensions = {};
	if ('extensions' in parameters) {
		if ('appid' in parameters.extensions) {
			requestOptions.extensions.appid = parameters.extensions.appid;
		}
	}
	/*Yubikey sigin issue on android mobile issue temporary fix
	requestOptions.extensions.uvm = true;*/
	return navigator.credentials.get({
		"publicKey": requestOptions //No I18N
	}).then(function(assertion) {
	    var publicKeyCredential = {};
	    if ('id' in assertion) {
	      publicKeyCredential.id = assertion.id;
	    }
	    if ('type' in assertion) {
	      publicKeyCredential.type = assertion.type;
	    }
	    if ('rawId' in assertion) {
	      publicKeyCredential.rawId = binToStr(assertion.rawId);
	    }
	    if (!assertion.response) {
			showCommonError("yubikey",formatMessage(I18N.get("IAM.WEBAUTHN.ERROR.AUTHENTICATION.InvalidResponse"),accounts_support_contact_email_id)); //no i18n
			$("#yubikey_container").show();
			showError();
	    }
	    /*Yubikey sigin issue on android mobile issue temporary fix
	    if (assertion.getClientExtensionResults) {
	      if (assertion.getClientExtensionResults().uvm != null) {
	        publicKeyCredential.uvm = serializeUvm(assertion.getClientExtensionResults().uvm);
	      }
	    }
        */
	    var _response = assertion.response;

	    publicKeyCredential.response = {
	      clientDataJSON:     binToStr(_response.clientDataJSON),
	      authenticatorData:  binToStr(_response.authenticatorData),
	      signature:          binToStr(_response.signature),
	      userHandle:         binToStr(_response.userHandle)
	    };
	     var yubikey_sec_data ={};
	     yubikey_sec_data.yubikeysecauth = publicKeyCredential;
	     sendRequestWithTemptoken("/signin/v2/secondary/"+zuid+"/yubikey/self?"+signinParams,JSON.stringify(yubikey_sec_data),true,VerifySuccess,"PUT");//no i18N
	}).catch(function(err) {
		if(err.name == 'NotAllowedError') {
			showCommonError("yubikey",I18N.get("IAM.WEBAUTHN.ERROR.NotAllowedError")); //no i18n	
		} else if(err.name == 'InvalidStateError') {
			showCommonError("yubikey",I18N.get("IAM.WEBAUTHN.ERROR.AUTHENTICATION.InvalidStateError")); //no i18n	
		} else if (err.name == 'AbortError') {
			showCommonError("yubikey",I18N.get("IAM.WEBAUTHN.ERROR.NotAllowedError")); //no i18n
		} else if(err.name == 'UnknownError') {
			showCommonError("yubikey",formatMessage(I18N.get("IAM.WEBAUTHN.ERROR.UnknownError"), accounts_support_contact_email_id)); //no i18n
		} else {
			showCommonError("yubikey",formatMessage(I18N.get("IAM.WEBAUTHN.ERROR.AUTHENTICATION.ErrorOccurred"),accounts_support_contact_email_id)+ '<br>' +err.toString()); //no i18n
		}
		$("#yubikey_container").show();
		showError();
	});
}

function showYubikeyDetails(){
	var headtitle="IAM.NEW.SIGNIN.YUBIKEY.TITLE";//no i18n
	var headerdesc= isMobile?"IAM.NEW.SIGNIN.YUBIKEY.HEADER.NEW.FOR.MOBILE":"IAM.NEW.SIGNIN.YUBIKEY.HEADER.NEW";//no i18n
	$("#password_container,#login_id_container,#captcha_container,.fed_2show,#otp_container").hide();
	$("#headtitle").text(I18N.get(headtitle));
	if(isRecovery){
		$("#headtitle").prepend( "<span class='icon-backarrow backoption recbackop'></span>" );
		$(".recbackop").on("click",function(){
			hideCantAccessDevice(this)
		});
	}
	$(".service_name").text(I18N.get(headerdesc));
	$(".product_text,.product_head,.MAppIcon,.OnaAuthHLink,.pwless_head,.pwless_text").hide();
	$("#product_img").removeClass($("#product_img").attr('class'));
	$("#product_img").addClass("tfa_yubikey_mode");
	$("#forgotpassword").hide();
	$("#nextbtn").hide();
	$(".service_name").addClass("extramargin");
	$('.deviceparent').removeClass('hide');
	$('.deviceparent').css('display','');
	$("#mfa_device_container,.devicedetails").show();
	$(".devices").hide();
	$("#waitbtn").show();
	$(".loadwithbtn").show();
	$(".waitbtn .waittext").text(I18N.get("IAM.NEW.SIGNIN.WAITING.APPROVAL"));
	$("#waitbtn").attr("disabled", true);
	if (!isRecovery) {allowedModeChecking();}
	return false;
}
function triggerPostRedirection(url,loginid){
	if(url){
		var oldForm = document.getElementById("postredirection");
		if(oldForm) {
			document.documentElement.removeChild(oldForm);
		}
		var form = document.createElement("form");
		form.setAttribute("id", "postredirection");
		form.setAttribute("method", "POST");
	    form.setAttribute("action", url);
	    form.setAttribute("target", "_self");
		var hiddenField = document.createElement("input");
		var csrfField = document.createElement("input");				
		
		csrfField.setAttribute("type", "hidden");
		csrfField.setAttribute("name", csrfParam);
		csrfField.setAttribute("value", getCookie(csrfCookieName));
	    
		if(loginid){
			hiddenField.setAttribute("type", "hidden");
			hiddenField.setAttribute("name", "LOGIN_ID");
			hiddenField.setAttribute("value", loginid );
		} 
		
		form.appendChild(hiddenField);
		form.appendChild(csrfField);
	   	document.documentElement.appendChild(form);
	  	form.submit();
	  	return false;
	}
	return false;
}
function handleLookupDetails(resp,isExtUserVerified,ispasskeyfailed,chooseParentRegion){
	if($(".blur,.loader").is(":visible")){
		$(".blur,.loader").hide();	
	}
	if($("#problemsigninui").is(":visible") && ispasskeyfailed){
		isPasswordless = false;
		showmoresigininoption();
		return false;
	}
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		var statusCode = jsonStr.status_code;
		if(jsonStr.code==="U300"){
			if(isValid(jsonStr.lookup.signup_url)){
				triggerPostRedirection(jsonStr.lookup.signup_url,jsonStr.lookup.loginid);
			}
			return false;
		}
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			deviceauthdetails=jsonStr;
			if (jsonStr.lookup.regional_dc_list && !chooseParentRegion) {
				showRegionSelectScreen(jsonStr.lookup.regional_dc_list,isExtUserVerified);
				return false;
			}
			$(".fed_2show,.line,#signuplink,.banner_newtoold,#signuplink,#forgotpassword").hide();
			$("#smartsigninbtn").addClass("hide");
			digest = jsonStr[signinathmode].digest;
			zuid = jsonStr[signinathmode].identifier;
			if(!hideCCode && isPhoneNumber(de("login_id").value)){
				$('#login_id').val($("#country_code_select").val().split('+')[1]+ "-" + $('#login_id').val().trim());
			}
			if(!isExtUserVerified){
				if(jsonStr[signinathmode].ext_usr){
	                $("#forgotpassword,#nextbtn").hide();
					var loginId = jsonStr[signinathmode].loginid?jsonStr[signinathmode].loginid:de("login_id").value;//no i18n
					$("#login_id_container,#showIDPs").slideUp(200);
					$("#password_container").removeClass("zeroheight");
					$("#password_container").slideDown(200);
					$('.username').text(identifyEmailOrNum());
					$("#password_container .textbox_div").hide();
					$(".externaluser_container").html(jsonStr[signinathmode].ext_msg);
					$(".externaluser_container,#continuebtn").show();
					return false;
				}
			}else{
				$(".externaluser_container,#continuebtn").hide();
				$("#forgotpassword,#nextbtn").show();
				$("#login_id_container,#showIDPs").slideDown(200);
				$("#password_container").addClass("zeroheight");
				$("#password_container .textbox_div").show();
			}
			adminEmail = jsonStr[signinathmode].admin;
			contactAdminHelpdoc = jsonStr[signinathmode].doc_link;
			identifyEmailOrNum(jsonStr[signinathmode].loginid?jsonStr[signinathmode].loginid:de("login_id").value);
			if($(".hellouser").find(".parent_username").length > 1){
				remove_EncLoginID(".username", ".hellouser");//no i18n
			}
			if(jsonStr[signinathmode].maskedDisplayID){
				append_EncLoginID(".username", jsonStr[signinathmode].maskedDisplayID); // no i18n
			}
			$('.username').text(identifyEmailOrNum());
			if(isEmpty(jsonStr[signinathmode].modes) || !isValid(jsonStr[signinathmode].modes) || (ispasskeyfailed && jsonStr[signinathmode].modes.allowed_modes.length == 1 && jsonStr[signinathmode].modes.allowed_modes.indexOf("passkey") != -1)){
                changeButtonAction(I18N.get('IAM.SIGN_IN'),false);//no i18n
                $("#forgotpassword").hide();
				var loginId = jsonStr[signinathmode].loginid?jsonStr[signinathmode].loginid:de("login_id").value;//no i18n
				$("#login_id_container,#showIDPs").slideUp(200);
				$("#password_container").removeClass("zeroheight");
				$("#password_container").slideDown(200);
				identifyEmailOrNum(loginId);
				$('.username').text(identifyEmailOrNum());
				$("#password_container .textbox_div,#nextbtn").hide();
				window.setTimeout(function (){
					enableNoPassPopup();;
				},200);
				$("#captcha_container").hide();
				return false;
			}
			if(deviceauthdetails.lookup.showNotePasswordLessEnforced){
				showHideEnforcePop(true);
			}
			isPrimaryMode =  true;
			allowedmodes = jsonStr[signinathmode].modes.allowed_modes;
			prev_showmode = allowedmodes[0];
			$(".otp_actions .signinwithjwt,.otp_actions .signinwithsaml,.otp_actions .showmoresigininoption").hide();
			var identifiers = getIdentifierDetails();
			var lmp = (!isClientPortal && (typeof(isParamLoginID) != "undefined" && isParamLoginID));// no i18n
			if(ispasskeyfailed){
				allowedmodes.splice(allowedmodes.indexOf("passkey"), 1);
				isPasswordless=false;
			} 
			isEmailVerifyReqiured = jsonStr[signinathmode].isUserName && allowedmodes.indexOf("email") != -1 ? true : false;
			if(allowedmodes[0]==="passkey"){
				enablePassKey();
				return false;
			} else if( allowedmodes[0] === "password" || allowedmodes[0] === "ldap"){
				signinathmode = "passwordauth"; // no i18n
				if(allowedmodes[0] === "ldap"){
					$("#password").attr("placeholder",I18N.get("IAM.LDAP.PASSWORD.PLACEHOLDER"));
					$('.blueforgotpassword').hide();
					signinathmode = "ldappasswordauth"; // no i18n
				}
				prev_showmode = allowedmodes[0];
				enableOptionsAsPrimary(allowedmodes[0]);
				enableFieldFirstFactor();
				$("#password").focus();
				return false;					
			}else if(allowedmodes[0] === "federated" ){
				$("#password_container").show();
				$("#login_id_container .textbox_div,#password_container .textbox_div,#nextbtn").hide();
				$("#captcha_container,.line").hide();
				enableOptionsAsPrimary(allowedmodes[0]);
				return false;
			}else if( allowedmodes[0] === "otp" || allowedmodes[0] === "email"){
				emobile = allowedmodes[0] === "otp" ? jsonStr[signinathmode].modes.otp.data[0].e_mobile : jsonStr[signinathmode].modes.email.data[0].e_email;
				rmobile = allowedmodes[0] === "otp" ? identifyEmailOrNum(jsonStr[signinathmode].modes.otp.data[0].r_mobile,true) : jsonStr[signinathmode].modes.email.data[0].email;
				$('#signinwithpass').hide();
				enableOTP(allowedmodes[0]);
				enableOptionsAsPrimary(allowedmodes[0]);
				enableFieldFirstFactor();
				return false;
			}else if(allowedmodes[0]==="totp"){
				enableFieldFirstFactor();
				enableTotpAsPrimary();
				return false;
			}else if(allowedmodes[0]==="mzadevice"){
				isPasswordless=true;
				secondarymodes = allowedmodes;
				var secondary_modes = jsonStr[signinathmode].secondary_modes && jsonStr[signinathmode].secondary_modes.allowed_modes;
				recoverymodes = secondary_modes;
				secondarymodes.push.apply(secondarymodes,secondary_modes);
				mzadevicepos = 0;
				handleSecondaryDevices(allowedmodes[0]);
				enableMyZohoDevice(jsonStr);
				return false;
			}else if(allowedmodes[0]==="saml"){
				var isMoreSaml = jsonStr[signinathmode].modes.saml.count > 1;
				if((isMoreSaml || (allowedmodes.length > 1)) || jsonStr[signinathmode].show_setpassword  || identifiers.count > 1){
					showSigninFedOptionalone(loginId);
				}else{
					lmp ? handleOpenRedirection(jsonStr[signinathmode].modes.saml.data[0],"saml") : selectedRegionalDC ? enableSamlAuth() : redirectToSaml(jsonStr[signinathmode].modes.saml.data[0]);
				}
				return false;
			}else if(allowedmodes[0]==="jwt"){
				var isMoreJwt = jsonStr[signinathmode].modes.jwt.count > 1;
				if(isMoreJwt || (allowedmodes.length > 1) || jsonStr[signinathmode].show_setpassword  || identifiers.count > 1){
					showSigninFedOptionalone(loginId);
				}else{
					lmp ? handleOpenRedirection(jsonStr[signinathmode].modes.jwt.data[0],"jwt") : switchto(jsonStr[signinathmode].modes.jwt.data[0].redirect_uri);
				}
				return false;
			}else if(allowedmodes[0]==="oidc"){
				var isMoreOidc = jsonStr[signinathmode].modes.oidc.count > 1;
				if(isMoreOidc || jsonStr[signinathmode].show_setpassword || identifiers.count > 1){
					showSigninFedOptionalone(loginId);
				}else{
					lmp ? handleOpenRedirection(jsonStr[signinathmode].modes.oidc.data[0],"oidc") : enableOIDCAuth();
				}
				return false;
			}			
		}else{
			if(jsonStr.cause==="throttles_limit_exceeded"){
				callback_signin_lookup(jsonStr.localized_message);
				return false;
			}
			var error_resp = jsonStr.errors[0];
			var errorCode=error_resp.code;
			var errorMessage = jsonStr.localized_message;
			if(errorCode === "U400" || errorCode === "U301"){ //no i18N
				var loginid = jsonStr.data.loginid;
				if(loginid && (isEmailIdSignin(loginid) || isUserName(loginid)) || (!hideCCode && isPhoneNumber(loginid.split('-')[1]))){
		    		var deploymentUrl = jsonStr.data.redirect_uri;
			    	var signinParams = removeParamFromQueryString("LOGIN_ID");//No I18N
			    	var loginurl = deploymentUrl + (deploymentUrl.indexOf("?") != -1 ? "&" : "?") + signinParams; //no i18n
			    	triggerPostRedirection(loginurl,loginid);
		    	  	return false;
		    	}
		    	return false;
			} else if (errorCode === "EMAIL509") { //no i18n
				errorMessage = formatMessage(I18N.get("IAM.ERROR.PORTAL.UNCONFIRMED.USER"), supportEmailAddress);
				showCommonError("login_id",errorMessage); //no i18n
			}
			else if(errorCode==="U201"){ //no i18n
				switchto(error_resp.redirect_uri);
				return false;
			}
			else if(errorCode==="IN107" || errorCode === "IN108"){
				isSignupCaptcha = jsonStr.isSignupCaptcha;
				cdigest= isSignupCaptcha ? jsonStr.data.cdigest : jsonStr.cdigest;
				showHip(cdigest); //no i18N 
				showCaptcha(I18N.get("IAM.NEXT"),false,"login_id");//no i18N
				if( errorCode === "IN107"){
					showCommonError("captcha",errorMessage); //no i18n	
				}
				return false;
			}
			else if(errorCode === "U401" || errorCode === "U410"){ //no i18N
				callback_signin_lookup(errorMessage);
				$("#i18nsignup").css({
					"color": "#309FF4",	//No i18N
					"display": "inline",	//No i18N
					"cursor": "pointer"		//No i18N
				});
				$("#i18nsignup").on('click',function(){
					iamMovetoSignUp($(this).attr("data-link"),$(this).attr("data-id"));
				});
				if(isShowFedOptions){
					if(!isMobile){$(".line").show()}
					fediconsChecking();
				}
				return false;
			}else if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}else if((errorCode === "U404" || errorCode === "RIP104") &&  (typeof canShowResetIP!="undefined" &&	canShowResetIP=='true')){ //no i18N
				hiderightpanel();
				$("#login,.fed_2show,.line, .ip_orgDiv").hide();
				var LOGIN_ID = de('login_id').value.trim(); // no i18n
				LOGIN_ID= (!hideCCode && isPhoneNumber(LOGIN_ID))?  $( "#country_code_select" ).val().split("+")[1]+'-'+LOGIN_ID : LOGIN_ID;
				$('.resetIP_container .username').text(identifyEmailOrNum(LOGIN_ID));
				var IP = jsonStr.currentIp != undefined ? jsonStr.currentIp : currentIP;
				$("#ip_desc").html(formatMessage(I18N.get("IAM.SIGNIN.ERROR.USER.NOT.ALLOWED.IP.RESETOPTION"),IP,ipRestrictionLearn));
				$(".resetIP_container,#goto_resetIP").show();
				$(".zoho_logo").addClass('applycenter');
				if($("#smartsigninbtn").length==1)
				{
					$("#smartsigninbtn").addClass("hide");
				}
				$("#signuplink").hide();
				if(errorCode === "RIP104"){//no i18N
					$("#goto_resetIP").hide();
					$(".ip_orgDiv").css("display","flex");
					$(".ip_orgAdminEmail").text(jsonStr.adminEmail);//no i18n
				}
			}else if(errorCode === "DOMAIN500"){//no i18N
				$("#signin_div, #signuplink, .smartsigninbutton").hide();
				$(".zoho_logo").addClass("logoCentre");
				$("#domain_error").show();
				$(".domain_err_heading").text(I18N.get("IAM.NEW.SIGNIN.RESTRICT.SIGNIN.HEADER"));//no i18N
				$(".domain_err_content").text(errorMessage);
				$(".domain_err_info").text(I18N.get("IAM.DOMAIN.WAIT.WARNING"));//no i18N
				$(".domain_refresh").text(I18N.get("IAM.REFRESH"));//no i18N
				$(".domain_refresh").on("click", function(){
					location.reload();
				})
			} else{
				callback_signin_lookup(errorMessage);
				return false;
			}
		}
	}else {
		callback_signin_lookup(I18N.get("IAM.ERROR.GENERAL"));
		return false;
	}
	return false;
}
function redirectToSaml(samlData){
	var redirect_uri = samlData.redirect_uri;
	if(samlData.method == 1 && isValid(redirect_uri) && isValid(samlData.RelayState) && isValid(samlData.SAMLRequest) && !selectedRegionalDC){
			var form = document.createElement("form");
			form.setAttribute("id", "samlform");
			form.setAttribute("method", "POST");
		    form.setAttribute("action", samlData.redirect_uri);
		    form.setAttribute("target", "_self");
			var RelayState = document.createElement("input");
			var SAMLRequest = document.createElement("input");
			
			RelayState.setAttribute("type", "hidden");
			RelayState.setAttribute("name", "RelayState");
			RelayState.setAttribute("value", samlData.RelayState);
	        
			SAMLRequest.setAttribute("type", "hidden");
			SAMLRequest.setAttribute("name", "SAMLRequest");
			SAMLRequest.setAttribute("value", samlData.SAMLRequest); 
			
			form.appendChild(RelayState);
			form.appendChild(SAMLRequest);
		   	document.documentElement.appendChild(form);
		  	form.submit();
		  	return false;
	}else if(isValid(redirect_uri) && !selectedRegionalDC){
		switchto(redirect_uri);
	}else{
		enableSamlAuth(samlData.auth_domain);
	}
}
function showSigninFedOptionalone(loginId){
	$("#login_id_container,#showIDPs").slideUp(200);
	identifyEmailOrNum(loginId);
	$('.username').text(identifyEmailOrNum());
	$("#captcha_container,.line").hide();
	$("#password_container").removeClass("zeroheight");
	$("#password_container").slideDown(200);
	$("#forgotpassword").hide();
	$("#password_container .textbox_div,#nextbtn").hide();
	showSigninUsingFedOption();
	enableNoPassPopup();
}
function showHideEnforcePop(needtoshow){
	var boxheight = bottomheight = elemdisplay = "";
	if(needtoshow){
		boxheight = $(".signin_box").outerHeight() + $("#device_box_info").outerHeight() + "px"; // no i18n
		bottomheight =  $("#device_box_info").outerHeight() + parseInt($(".tryanother").css("bottom")) + "px"; // no i18n
		elemdisplay = "flex"; // no i18n
	}
	$("#device_box_info").css("display",elemdisplay);
	$(".signin_box").css("height",boxheight);
	$(".tryanother").css("bottom",bottomheight);
}
function enableNoPassPopup(captcha){
	var show_setpassword = deviceauthdetails[deviceauthdetails.resource_name].show_setpassword;
	if(typeof show_setpassword != 'undefined' && show_setpassword){
		$(".nopassword_container").css("position","absolute");
		$(".nopassword_container").show();
		if(((typeof allowedmodes != "undefined")&&(allowedmodes.indexOf("otp") != -1 || allowedmodes.indexOf("email") != -1 || allowedmodes.indexOf("password") != -1)) && getIdentifierDetails().count > 0){
			$(".signin_box").css("height",$(".signin_box").outerHeight() + $(".nopassword_container").outerHeight() +"px"); // no i18n
		}else{
			$(".signin_box").css("height","580px");
		}
		if(captcha){
			$(".signin_box").css("height",$(".signin_box").outerHeight() + $(".nopassword_container").outerHeight()+"px"); // no i18n
		}
		if(isLargeFedIcons && allowedmodes.indexOf("federated") != -1 && isMobile){
			$(".signin_box").css("height", parseInt($(".signin_box").css("height")) + 50 +"px" );	//No I18N
			setFooterPosition();
		}
	}
}
function enablePassKey(){
	if(!isWebAuthNSupported()) {
		showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
		changeButtonAction(I18N.get("IAM.NEXT"),false);
		return false;
	}
	isPasswordless=true;
	$(".loader,.blur").show();
	enableWebauthnDevice();
	return false;
}
function enableOptionsAsPrimary(mode){
	$("#password_container").removeClass("zeroheight");
	$('.username').text(identifyEmailOrNum());
	$(".otp_actions,.enableotpoption").hide();
	var fallBackToShow = validateAllowedMode(mode);
	if(fallBackToShow.enableMore){
		if(isClientPortal){
			enableFallBackPortal(mode)
		}else{
			$('#enablemore').show();
			$('#enableforgot').hide();
			$(".showmoresigininoption").show();
			if(mode == "password" || mode == "ldap"){
				mode == "ldap" ? $('.blueforgotpassword').hide() : $('.blueforgotpassword').show();//no i18n
				$('.resendotp').hide();
			}else if(mode == "email" || mode == "otp"){ // no i18n
				$('.blueforgotpassword').hide();
				$('.resendotp').show();
			}
		}
	}else if(fallBackToShow.nootheroption){
		$('#enablemore').hide();
		$('#enableforgot').show();
	}else{
		fallBackForSingleMode(mode,fallBackToShow.option);
	}
	showIdentifiers();
	window.setTimeout(function (){
		enableNoPassPopup();;
	},200);
	return false;
}
function enableFieldFirstFactor(){
	changeButtonAction(I18N.get('IAM.SIGN_IN'),false);//no i18n
	$("#login_id_container,#showIDPs").slideUp(200);
	$("#password_container").removeClass("zeroheight");
	$("#password_container").slideDown(200);
	$(".backbtn").show();
	$("#captcha_container,.line").hide();
	$('.username').text(identifyEmailOrNum());
	return false;
}
function enableTotpAsPrimary(){
	signinathmode = "totpauth"; // no i18n
	$("#password_container .textbox_div,#captcha_container,#otp_container,#problemsigninui, #problemsignin_container").hide();
	$("#forgotpassword").hide();
	$("#mfa_totp_container").show();
	$("#nextbtn span").removeClass("zeroheight");
	$("#password_container").addClass("zeroheight");
	$("#nextbtn").removeClass("changeloadbtn");
	$("#nextbtn").attr("disabled", false);
	$("#nextbtn span").text(I18N.get("IAM.NEW.SIGNIN.VERIFY"));
	$("#login .signin_head,#nextbtn").show();
	$(".resendotp,.blueforgotpassword").hide()
	if(!isClientPortal){
		enableSplitField("mfa_totp",totp_size,I18N.get("IAM.NEW.SIGNIN.VERIFY.CODE")); // no i18n
		$('#mfa_totp').click();
	}else{
		$('#mfa_totp').focus()
	}
	if(!isPasswordless){
		$(".fed_2show").hide();
		fallBackForSingleMode("totp", validateAllowedMode("totp").option); // no i18n
	}else{
			if(typeof oaNotInstalled != "undefined" && oaNotInstalled){
				$(".service_name").html(I18N.get("IAM.NEW.SIGNIN.MFA.TOTP.HEADER"));
			}
			$("#enableotpoption,#enablesaml,#enablejwt,#enablemore .resendotp,#enableoptionsoneauth,#signinwithpassoneauth").hide();
			var showingmodes = secondarymodes;
			if(showingmodes.length == 3){
				showingmodes.indexOf("otp") != -1  || showingmodes.indexOf("email") != -1 ? $("#enableotpoption").show() : showingmodes.indexOf("ldap") != -1 ? $("#enableldap").show() : ""; // no i18n
			}else if(showingmodes.length > 2){
				$("#enablemore").show();
			}
	}
	return false;
}
function showPrimaryTotp(){
	enableTotpAsPrimary();
	prev_showmode =  "totp"; // no i18n
	return false;
}
function fallBackForSingleMode(mode,fallBackOption){
	if(mode == fallBackOption){
		return false;
	}else if(isClientPortal){
		enableFallBackPortal(mode);
		return false;
	}
	var authenticationmode = deviceauthdetails[deviceauthdetails.resource_name].modes;
	$(".otp_actions,#enableotpoption").hide();
	$('#enablemore').show();
	$('.showmoresigininoption').off('click');
	if(fallBackOption == "password"){
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.USING.PASSWORD")); // no i18n
		$(".showmoresigininoption").on("click",function(){
			showPassword();
		});
	}else if(fallBackOption == "otp"){ // no i18n
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.USING.MOBILE.OTP"));
		$(".showmoresigininoption").on("click",function(){
			showAndGenerateOtp(fallBackOption);
		});
	}else if(fallBackOption == "email"){ // no i18n
		isEmailVerifyReqiured = deviceauthdetails[deviceauthdetails.resource_name].isUserName ? true : false;
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.USING.EMAIL.OTP"));
		$(".showmoresigininoption").on("click",function(){
			showAndGenerateOtp(fallBackOption);
		});
	}else if(fallBackOption == "passkey"){ // no i18n
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.USING.PASSKEY")); // no i18n
		$('.showmoresigininoption').on("click",function(){
			enablePassKey();
		});
	}else if(fallBackOption == "totp"){ // no i18n
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.ENTER.TOTP.FIRST.FACTOR")); // no i18n
		$('.showmoresigininoption').on("click",function(){
			enableTotpAsPrimary();
		});
	}else if(fallBackOption == "mzadevice"){ // no i18n
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.USING.ONEAUTH.FIRST.FACTOR")); // no i18n
		$('.showmoresigininoption').on("click",function(){
			enableMyZohoAsPrimary();
		});
	}else if(fallBackOption == "ldap"){ // no i18n
		$('.showmoresigininoption').html(I18N.get("IAM.NEW.SIGNIN.USING.LDAP.PASSWORD")); // no i18n
		$('.showmoresigininoption').on("click",function(){
			showPassword(true);
		});
	}else{
		$(".showmoresigininoption").html(I18N.get("IAM.NEW.SIGNIN.TRY.ANOTHERWAY"));//No i18n
		$('.showmoresigininoption').click(function() {
		if($(this).hasClass("getbackemailverify")){
				showmoresigininoption('getbackemailverify');
				return false;
			}
			showmoresigininoption();
		});
	}
	if(mode == "password" || mode == "ldap"){
		if(mode == "password"){
			$(".blueforgotpassword").show();
		}else{
			$(".blueforgotpassword").hide();
			$("#password").attr("placeholder",I18N.get("IAM.LDAP.PASSWORD.PLACEHOLDER"));
		}
		$(".resendotp").hide();
	}else if(mode == "otp" || mode == "email"){ // no i18n
		$(".blueforgotpassword").hide();
		$(".resendotp").show();
	}
	return false;
}
function enableFallBackPortal(mode){
	if(mode == "password"){
		$('.textbox_actions,#enableforgot,#enableotpoption,#signinwithotp').hide();
		if(allowedmodes.indexOf("otp") != -1){
			$('#signinwithotp').html(I18N.get("IAM.NEW.SIGNIN.USING.MOBILE.OTP"));
			$('#signinwithotp').off("click");
			$('#signinwithotp').on("click", function(){
				showAndGenerateOtp("otp"); // no i18n
			});
			$("#enableotpoption,#signinwithotp").show();
		}else if(allowedmodes.indexOf("email") != -1){
			$('#signinwithotp').html(I18N.get("IAM.NEW.SIGNIN.USING.EMAIL.OTP"));
			$('#signinwithotp').off("click");
			$('#signinwithotp').on("click", function(){
				showAndGenerateOtp("email"); // no i18n
			});
			$("#enableotpoption,#signinwithotp").show();
		}else{
			$('#enableforgot').show();
		}
	}else if(mode == "otp" || mode == "email"){ // no i18n
		$('.textbox_actions,#signinwithpass,.resendotp').hide();
		if(allowedmodes.indexOf("password") != -1){
			$(".textbox_actions,#signinwithpass,.resendotp").show();
		}else{
			$(".textbox_actions,.resendotp").show();
		}
	}
	return false;
}
function getIdentifierDetails(){
	var userIdentifiers = {"saml" : false, "jwt" : false, "federated" : false, "oidc" : false, count : 0}; // no i18n
	allowedmodes.forEach(function (mode) {
	    if(mode == "jwt" || mode == "saml" || mode == "federated" || mode == "oidc"){
	    	userIdentifiers[mode] = true;
	    	userIdentifiers.count = userIdentifiers.count + 1;
	    }
	});
	return userIdentifiers;
}
function showIdentifiers(){
	var identifiers =  getIdentifierDetails();
	if(identifiers.count < 1){
		return false;
	}else{
		var autheticationmodes = deviceauthdetails[deviceauthdetails.resource_name].modes;
		$(".fed_2show").show();
		if(!isLargeFedIcons){
			$(".large_box").removeClass("large_box");
			$(".fed_div").addClass("small_box");
			$(".fed_text").hide();
			$(".googleIcon").removeClass("google_small_icon");	
		}
		$(".fed_div").hide();
		document.getElementById("fed_signin_options").innerHTML="";
		if(identifiers.oidc){
			if(autheticationmodes.oidc && autheticationmodes.oidc.count > 1){
				var oidcCount = autheticationmodes.oidc.count;
				for(var i = 0; i < oidcCount; i++){
					appendOIDC(i)
				}
			}else{
				appendOIDC(0);
			}
		}
		if(identifiers.saml == true){
			if(autheticationmodes.saml && autheticationmodes.saml.count > 1){
				var samlCount = autheticationmodes.saml.count;
				for(var i = 0; i < samlCount; i++){
					appendSAML(i)
				}
			}else{
				appendSAML(0);
			}
		}if(identifiers.jwt){
			if(autheticationmodes.jwt && autheticationmodes.jwt.count > 1){
				var jwtCount = autheticationmodes.jwt.count;
				for(var i = 0; i < jwtCount; i++){
					appendJWT(i)
				}
			}else{
				appendJWT(0);
			}
		}if(identifiers.federated){
			var idps = deviceauthdetails.lookup.modes.federated.data;
			idps.forEach(function(idps){
				if(isValid(idps)){
					idp = idps.idp.toLowerCase();
					$("."+idp+"_fed").attr("style","display:block !important");
					if(isLargeFedIcons){
						$("."+idp+"_fed").addClass("large_box").removeClass("small_box");	
					}					
	            }
			});
			if($(".apple_fed").is(":visible")){
				if(!isneedforGverify) {
					$(".apple_fed").hide();
					$("#macappleicon").show();
			    	$(".googleIcon").addClass("google_small_icon");
				}else{$("#macappleicon").hide();}
			}
			if(!isLargeFedIcons){
				isneedforGverify ? $(".google_icon .fed_text").show(): $(".google_icon .fed_text").hide();		
			}
			
		}
	}
}
function enableMyZohoAsPrimary(){
	isPasswordless=true;
	secondarymodes = allowedmodes;
	var secondary_modes = jsonStr[signinathmode].secondary_modes && jsonStr[signinathmode].secondary_modes.allowed_modes;
	recoverymodes = secondary_modes;
	secondarymodes.push.apply(secondarymodes,secondary_modes);
	handleSecondaryDevices(allowedmodes[0]);
	enableMyZohoDevice(jsonStr);
	return false;
}
function enableWebauthnDevice(){
	if(!isWebAuthNSupported()){
		showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
		return false;
	}
	var loginurl = uriPrefix + "/signin/v2/primary/"+zuid+"/passkey/self?";// : "/signin/v2/"+callmode+"/"+zuid+"/webauthn?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	sendRequestWithCallback(loginurl,"",true,handleWebauthnDevice);
	return false;
}
function handleWebauthnDevice(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			if(successCode==="SI203"){
				getAssertionLookup(jsonStr.passkeyauth);
			}	
		}
		else{
			if(jsonStr.cause==="throttles_limit_exceeded"){
				var errorMsg = ((allowedmodes.length == 1) && (allowedmodes[0] == "passkey")) ?  I18N.get("IAM.NEW.SIGNIN.PASSKEY.THROTTLE.ERROR.MSG.SINGLE.MODE") : I18N.get("IAM.NEW.SIGNIN.PASSKEY.THROTTLE.ERROR.MSG");//no i18n
				if(isPrimaryMode && ( !($("#yubikey_container").is(":visible")) ) ){
					showTopErrNotification(errorMsg,"",7000);
					signinathmode = "lookup"; // no i18n
					handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
					return false;
				}else{
					showCommonError("yubikey",jsonStr.localized_message); //no i18n
					return false;
				}
			}
			showCommonError("password",jsonStr.localized_message); //no i18n
			return false;
		}
		return false;
	   	
	}else{
		 var errorcontainer = signinathmode ==="passwordauth"? "password":"login_id";//no i18n
		 showCommonError(errorcontainer,I18N.get(jsonStr.localized_message));
		return false;	
	}
	return false;
}
function getAssertionLookup(parameters) {
	var requestOptions = {};
	requestOptions.challenge = strToBin(parameters.challenge);
	requestOptions.timeout = parameters.timeout;
	requestOptions.rpId = parameters.rpId;
	requestOptions.allowCredentials = credentialListConversion(parameters.allowCredentials);
	if ('authenticatorSelection' in parameters) {
      requestOptions.authenticatorSelection = parameters.authenticatorSelection;
    }
	requestOptions.extensions = {};
	if ('extensions' in parameters) {
		if ('appid' in parameters.extensions) {
			requestOptions.extensions.appid = parameters.extensions.appid;
		}
	}
	/*Yubikey sigin issue on android mobile issue temporary fix
	requestOptions.extensions.uvm = true;*/
	return navigator.credentials.get({
		"publicKey": requestOptions //No I18N
	}).then(function(assertion) {
	    var publicKeyCredential = {};
	    if ('id' in assertion) {
	      publicKeyCredential.id = assertion.id;
	    }
	    if ('type' in assertion) {
	      publicKeyCredential.type = assertion.type;
	    }
	    if ('rawId' in assertion) {
	      publicKeyCredential.rawId = binToStr(assertion.rawId);
	    }
	    if (!assertion.response) {
	    	showTopErrNotification(formatMessage(I18N.get("IAM.WEBAUTHN.ERROR.AUTHENTICATION.PASSKEY.InvalidResponse"),accounts_support_contact_email_id),"",3000);
	    	signinathmode = "lookup"; // no i18n
	    	handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
	    }
	    /*Yubikey sigin issue on android mobile issue temporary fix
	    if (assertion.getClientExtensionResults) {
	      if (assertion.getClientExtensionResults().uvm != null) {
	        publicKeyCredential.uvm = serializeUvm(assertion.getClientExtensionResults().uvm);
	      }
	    }
        */
	    var _response = assertion.response;

	    publicKeyCredential.response = {
	      clientDataJSON:     binToStr(_response.clientDataJSON),
	      authenticatorData:  binToStr(_response.authenticatorData),
	      signature:          binToStr(_response.signature),
	      userHandle:         binToStr(_response.userHandle)
	    };
	     var passkey_data ={};
	     passkey_data.passkeyauth = publicKeyCredential;
	     sendRequestWithTemptoken(uriPrefix+"/signin/v2/primary/"+zuid+"/passkey/self?"+"digest="+digest+ "&" + signinParams,JSON.stringify(passkey_data),true,VerifySuccess,"PUT");//no i18N
	}).catch(function(err) {
		if(err.name == 'NotAllowedError') {
			showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.NotAllowedError"),"",3000); //no i18n	
			signinathmode = "lookup"; // no i18n
			handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
		} else if(err.name == 'InvalidStateError') {
			showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.AUTHENTICATION.PASSKEY.InvalidStateError"),"",3000); //no i18n	
			signinathmode = "lookup"; // no i18n
			handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
		} else if (err.name == 'AbortError') {
			showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.NotAllowedError"),"",3000); //no i18n
			signinathmode = "lookup"; // no i18n
			handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
		} else if (err.name == 'TypeError') {
			isClientPortal ? showTopErrNotificationStatic(I18N.get("IAM.WEBAUTHN.ERROR.TYPE.ERROR")) : showTopErrNotificationStatic(I18N.get("IAM.WEBAUTHN.ERROR.TYPE.ERROR"), formatMessage(I18N.get("IAM.WEBAUTHN.ERROR.HELP.HOWTO"), passkeyURL), 3000); //no i18n
			signinathmode = "lookup"; // no i18n
			handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
		} else {
			showTopErrNotification(formatMessage(I18N.get("IAM.WEBAUTHN.ERROR.AUTHENTICATION.PASSKEY.ErrorOccurred"),accounts_support_contact_email_id)+ '<br>' +err.toString(),"",3000); //no i18n
			signinathmode = "lookup"; // no i18n
			handleLookupDetails(JSON.stringify(deviceauthdetails), false,true);
		}
	});
}
function showmoresigininoption(isMoreSaml){
	if(isPasswordless){
		if($("#password").is(":visible")){
			prev_showmode = isLdapVisible ? "ldap" : "password";//no i18n
		}
		$("#enableoptionsoneauth").is(":visible") ? $("#enableoptionsoneauth").hide() : $("#enableoptionsoneauth").show();
		allowedmodes.indexOf("password") != -1 && prev_showmode != "password" ? $("#signinwithpassoneauth").css("display","block") : $("#signinwithpassoneauth").hide(); // no i18n
		allowedmodes.indexOf("ldap") != -1 && prev_showmode != "ldap" ? $("#signinwithldaponeauth").css("display","block") : $("#signinwithldaponeauth").hide(); // no i18n
		allowedmodes.indexOf("otp") != -1 && prev_showmode != "otp" ? $("#signinwithotponeauth").css("display","block") : $("#signinwithotponeauth").hide(); // no i18n
		allowedmodes.indexOf("email") != -1 && prev_showmode != "email" ? $("#passlessemailverify").css("display","block") : $("#passlessemailverify").hide(); // no i18n
		allowedmodes.indexOf("totp") != -1 && prev_showmode != "totp" ? $("#signinwithtotponeauth").css("display","block") : $("#signinwithtotponeauth").hide(); // no i18n
		allowedmodes.indexOf("otp") != -1 ? $("#signinwithotponeauth").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.PASSWORDLESS.OTP.VERIFY.TITLE"),identifyEmailOrNum(deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].r_mobile,true))) : "";
		allowedmodes.indexOf("email") != -1 ? $("#passlessemailverify").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.PASSWORDLESS.EMAIL.VERIFY.TITLE"),deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].email)) : "";
		if($("#enableoptionsoneauth").is(":visible")){
			setTimeout(function(){document.getElementsByClassName("signin_container")[0].addEventListener('click',function hideandforgetEnableoption(){
				$('#enableoptionsoneauth').hide();
				document.getElementsByClassName("signin_container")[0].removeEventListener('click',hideandforgetEnableoption)// no i18n
			})},10)
			}
		
		return false;
	}
	$('#enablemore').hide();
	if(!isMoreSaml){
		allowedmodes.splice(allowedmodes.indexOf(prev_showmode), 1);
		allowedmodes.unshift(prev_showmode);
	}
	$("#emailverify_container,#mfa_totp_container").hide();
	$("#login").show();
	var problemsignin_con = "";
	var i18n_msg = {"otp":["IAM.NEW.SIGNIN.OTP.TITLE","IAM.NEW.SIGNIN.OTP.HEADER"],"saml":["IAM.NEW.SIGNIN.SAML.TITLE","IAM.NEW.SIGNIN.SAML.HEADER"], "password":["IAM.NEW.SIGNIN.PASSWORD.TITLE","IAM.NEW.SIGNIN.PASSWORD.HEADER"],"jwt":["IAM.NEW.SIGNIN.JWT.TITLE","IAM.NEW.SIGNIN.SAML.HEADER"],"email":["IAM.NEW.SIGNIN.EMAIL.TITLE","IAM.NEW.SIGNIN.OTP.HEADER"],"ldap":["IAM.NEW.SIGNIN.WITH.LDAP","IAM.NEW.SIGNIN.LDAP.HEADER"], "totp":["IAM.NEW.SIGNIN.VERIFY.VIA.AUTHENTICATOR","IAM.NEW.SIGNIN.VERIFY.VIA.AUTHENTICATOR.DESC"]}; //No I18N
	var problemsigninheader = "<div class='problemsignin_head'><span class='icon-backarrow backoption problemsigninback'></span>"+I18N.get("IAM.NEW.SIGNIN.TRY.ANOTHERWAY")+"</div>";
	
	allowedmodes.forEach(function(prob_mode,position){
		if((position != 0) || isMoreSaml){
				var saml_position;
				var secondary_header = i18n_msg[prob_mode] ?  I18N.get(i18n_msg[prob_mode][0]) : "";
				var secondary_desc = i18n_msg[prob_mode] ?  I18N.get(i18n_msg[prob_mode][1]) : "";
				if(prob_mode==="otp"){
					var tempRmobile=identifyEmailOrNum(deviceauthdetails.lookup.modes.otp.data[0].r_mobile,true);
					secondary_desc = formatMessage(I18N.get(i18n_msg[prob_mode][1]),tempRmobile);
					problemsignin_con += createSigninMoreOptions(prob_mode,saml_position,secondary_header,secondary_desc);
				}
				else if(prob_mode==="email"){
					var tempRmobile=deviceauthdetails.lookup.modes.email.data[0].email;
					secondary_desc = formatMessage(I18N.get(i18n_msg[prob_mode][1]),tempRmobile);
					problemsignin_con += createSigninMoreOptions(prob_mode,saml_position,secondary_header,secondary_desc);
				}else if(prob_mode != "federated" && prob_mode != "saml" && prob_mode != "oidc" && prob_mode != "jwt"){//no i18n
					problemsignin_con += createSigninMoreOptions(prob_mode,saml_position,secondary_header,secondary_desc);
				}
		}
	});
	$('#problemsigninui').html(problemsigninheader +"<div class='problemsignincon'>"+ problemsignin_con+"</div>");
	$('#password_container,#nextbtn,.signin_head,#otp_container,#captcha_container,.fed_2show').hide();

	$('#problemsigninui, #problemsignin_container').show();
	$(".problemsigninback").on("click", function(){
		isMoreSaml === "getbackemailverify" ? getbackemailverify() : hideSigninOptions(); // no i18n
	});
	$('.showallowedmodeselem').on('click', function() {
		showallowedmodes($(this).attr("mode"),parseInt($(this).attr("index")));
	});
	return false;
}
function createSigninMoreOptions(prob_mode,saml_position,secondary_header,secondary_desc){
	var prefer_icon =  prob_mode; // no i18n
	var secondary_con = "<div class='optionstry options_hover showallowedmodeselem' id='secondary_"+prob_mode+"' mode="+prob_mode+" index="+saml_position+">\
							<div class='img_option_try img_option icon-"+prefer_icon+"'></div>\
							<div class='option_details_try decreasewidth'>\
								<div class='option_title_try'>"+secondary_header+"</div>\
								<div class='option_description'>"+secondary_desc+"</div>\
							</div>\
						</div>"
	return secondary_con;
}
function handlePasswordDetails(resp,allowmodelist){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) { 
			zuid = zuid ? zuid : jsonStr[signinathmode].identifier;
			restrictTrustMfa = jsonStr[signinathmode].restrict_trust_mfa || jsonStr[signinathmode].isAMFA;
			if(adminEmail === undefined){
				adminEmail = jsonStr[signinathmode].admin;
			}
			if(typeof adminEmail != 'undefined' && !(jsonStr[signinathmode].isAMFA)){
				$('.contact_support .option_title').html(I18N.get("IAM.NEW.SIGNIN.CONTACT.ADMIN.TITLE"));
				$('.contact_support .contactsuprt').html(formatMessage(I18N.get("IAM.NEW.SIGNIN.CONTACT.ADMIN.DESC"),adminEmail,contactAdminHelpdoc));
				if(isClientPortal){
					$('.contact_support .contactsuprt a').hide();
				}
				
			}
			if(!restrictTrustMfa) {
				trustMfaDays = ''+jsonStr[signinathmode].trust_mfa_days;
			}
			$('.overlapBanner,.dotHead,#emailverify_container,.username_info_container').hide();
			$('.mfa_panel,#login, .signin_head, #nextbtn').show();
			var successCode = jsonStr.code;
			$(".nopassword_container, #problemsignin_container").hide();
			$(".signin_box").css("height", "");
			if(jsonStr[signinathmode].isAMFA){
				$("#problemsignin").text(I18N.get("IAM.SIGNIN.VIEW.OTHER.OPTION"));
				$("#recoverybtn").text(I18N.get("IAM.NEW.SIGNIN.PROBLEM.SIGNIN"));
			}
			if(successCode === "SI302"|| successCode==="SI200" ||successCode === "SI300" || successCode === "SI301" || successCode === "SI303" || successCode === "SI305" || successCode === "SI507" || successCode === "SI509" || successCode === "SI506") {
				switchto(jsonStr[signinathmode].redirect_uri);
				return false;
			}else if(successCode==="P500"||successCode==="P501"||successCode==="P506"){//No i18N
				temptoken = jsonStr[signinathmode].token;
				showPasswordExpiry(jsonStr[signinathmode].pwdpolicy, successCode);
				$(".hellouser").hide();
				return false;
			}
			else if(successCode === "MFA302"){//No i18N
				$(".resendotp").removeClass("bluetext_action_right");
				$("#enablemore").hide();
				$("#mfa_totp_container, .hellouser").hide();
				if(!isValid(digest)){
					digest = jsonStr[signinathmode].digest;
				}
				allowedmodes = typeof allowmodelist !== 'undefined' ? allowmodelist :  jsonStr[signinathmode].modes.allowed_modes;
				if(allowedmodes != undefined && allowedmodes.indexOf("yubikey") != -1 && !isWebAuthNSupported()){ 
					//if yubikey not supported in user's browser, block signin on first factor form and show not supported error
					showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
					changeButtonAction(I18N.get("IAM.NEXT"),false);
					return false;
				}
				if(allowedmodes.length < 1){
					if(oaNotInstalled){
						showContactSupport();
					}
					else{
						showCantAccessDevice();
					}
					$("#product_img").removeClass($("#product_img").attr('class'));
					$("#product_img").addClass("tfa_ga_mode");
					$('#recovery_container .backoption').hide();
					return false;
				}
				isPrimaryMode = false;
				deviceauthdetails=jsonStr;
				isSecondary = allowedmodes.length > 1 && allowedmodes.indexOf("recoverycode") === -1 ? true : false;//no i18n
				temptoken = jsonStr[signinathmode].token;
				secondarymodes = allowedmodes;
				prev_showmode = allowedmodes[0];
				handleSecondaryDevices(prev_showmode);
				if(jsonStr[signinathmode].isAMFA){
					$('.fed_2show').hide();
					if(allowedmodes.length > 1){
						callmode="secondary";//no i18n
						showproblemsignin(false,true);
						$(".problemsignin_head .backoption").hide();
						return false;
					}
				}
				if(isPasswordless){
					isPasswordless = false;
					if(typeof allowmodelist == 'undefined'){
						secondarymodes.splice(secondarymodes.indexOf(prev_showmode), 1);
						secondarymodes.unshift(prev_showmode);
					}
					$(".backupstep span").text("2");
					$(".backupstep").show();
					if(allowedmodes.length > 1){
						callmode="secondary";//no i18n
						showMoreSigninOptions(true);
						if(oaNotInstalled){
							$(".rec_head_text").html(I18N.get('IAM.NEW.SIGNIN.FEDERATED.LOGIN.TITLE'));
							$(".recoveryhead").css("margin-bottom", "10px");
							
						}
						return false;
					}
					$("#backup_title").hide();
				}
				if(allowedmodes[0]==="otp" || allowedmodes[0]==="email"){
					if(jsonStr[signinathmode].isAMFA){
						$(".resendotp").show();
					}
					emobile = allowedmodes[0]==="otp" ? jsonStr[signinathmode].modes.otp && jsonStr[signinathmode].modes.otp.data[0].e_mobile : jsonStr[signinathmode].modes.email && jsonStr[signinathmode].modes.email.data[0].e_email;
					rmobile = allowedmodes[0]==="otp" ? jsonStr[signinathmode].modes.otp && identifyEmailOrNum(jsonStr[signinathmode].modes.otp.data[0].r_mobile,true) : jsonStr[signinathmode].modes.email && jsonStr[signinathmode].modes.email.data[0].email;
					callmode="secondary";//no i18n
					allowedmodes[0] ==="email" ? emailposition = 0 : mobposition = 0;
					generateOTP(false,allowedmodes[0]);
					return false;
				}
				else if(allowedmodes[0]==="mzadevice"){
					callmode="secondary";//no i18n
					mzadevicepos = 0;
					enableMyZohoDevice(jsonStr);
					return false;
				}
				else if(allowedmodes[0]==="oadevice"){
					callmode="secondary";//no i18n
					enableOneauthDevice(jsonStr, oadevicepos);
					return false;
				}
				else if(allowedmodes[0]==="yubikey"){
					callmode="secondary";//no i18N
					enableYubikeyDevice(jsonStr);
					return false;
				}
				else if(allowedmodes[0]==="recoverycode" || allowedmodes[0]==="passphrase"){
					callmode="secondary";//no i18N
					enableOneAuthBackup();
					return false;
				}
				enableMfaField(allowedmodes[0]);
				return false;
			}
		}else{
			var errorfield = $("#emailverify").is(":visible") ? "emailverify" : (signinathmode==="otpauth" || signinathmode==="arotpauth" )? "otp" : signinathmode == "totpauth" ? "mfa_totp" : "password" ; // no i18n
			if(jsonStr.cause==="throttles_limit_exceeded"){
				clearInterval(resendTimer);
				hideResendOTP();
				showCommonError(errorfield,jsonStr.localized_message);
				return false;
			}
			var error_resp = jsonStr.errors[0];
			var errorCode=error_resp.code;
			var errorMessage = jsonStr.localized_message;
			if(!isClientPortal){
				$(".signin_box").css("height","580px");
			}
			if(jsonStr.showUserNameError){
				$(".username_info_container").css("display", "inline-block");
				$(".signin_box").css("height","");
			}
			
			if(errorCode==="IN107" || errorCode === "IN108"){
				cdigest=jsonStr.cdigest;
				showHip(cdigest); //no i18N 
				showCaptcha(I18N.get("IAM.NEXT"),false,"password");//no i18N
				if(deviceauthdetails[deviceauthdetails.resource_name].show_setpassword){
					enableNoPassPopup(true);
				}
				if( errorCode === "IN107"){
					showCommonError("captcha",errorMessage); //no i18n	
				}
				return false;
			}else if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}else{
				showCommonError(errorfield ,errorMessage);
				return false;	
			}
		}
	}else{
		var errorfield = $("#emailverify").is(":visible") ? "emailverify" : (signinathmode==="otpauth" || signinathmode==="arotpauth") ?"otp":"password" ; // no i18n
		showCommonError(errorfield,I18N.get("IAM.ERROR.GENERAL")); //no i18n
		return false;
	}
	return false;
}
function handleTotpDetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name != undefined ? jsonStr.resource_name : signinathmode ;
		var statusCode = jsonStr.status_code;
		var container = signinathmode==="otpsecauth"?"mfa_otp": signinathmode==="otpauth" ? "otp" :"mfa_totp";//no i18n
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			$(".go_to_bk_code_container").removeClass("show_bk_pop");
			$(".go_to_bk_code_container").hide();
			var successCode = jsonStr.code;
			var statusmsg = jsonStr[signinathmode].status;
			if(successCode === "SI302"|| successCode==="SI200" ||successCode === "SI300" || successCode === "SI301" || successCode === "SI303" || successCode === "SI305" || successCode === "SI507" || successCode === "SI509" || successCode === "SI506"){
				switchto(jsonStr[signinathmode].redirect_uri);
				return false;
			}
			else if(statusmsg==="success"){
				if(restrictTrustMfa){
					updateTrustDevice(false);
					return false;
				}
				showTrustBrowser();
				return false;
			}
			else if(successCode==="P500"||successCode==="P501"||successCode==="P506"){
				temptoken = jsonStr[signinathmode].token;
				showPasswordExpiry(jsonStr[signinathmode].pwdpolicy,successCode);
				return false;
			}
		}else{
			
			container = isTroubleSignin ? 'verify_totp' : prev_showmode==="email" ? "mfa_email" : container; // no i18n
			if(jsonStr.cause==="throttles_limit_exceeded"){
				hideResendOTP();
				showCommonError(container,jsonStr.localized_message); //no i18n
				return false;
			}
			var error_resp = jsonStr.errors[0];
			var errorCode = error_resp.code;
			var errorMessage = jsonStr.localized_message;
			if(errorCode==="IN107" || errorCode === "IN108"){
				cdigest=jsonStr.cdigest;
				showHip(cdigest); //no i18N 
				showCaptcha(I18N.get("IAM.NEXT"),false,container);//no i18N
				if( errorCode === "IN107"){
					showCommonError("captcha",errorMessage); //no i18n	
				}
				return false;
			}else if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}else{
				showCommonError(container,errorMessage); //no i18n
				return false;	
			}
			return false;
		}
	}else{
		var container = signinathmode==="otpsecauth"?"mfa_otp": signinathmode==="otpauth" ? "otp" :"mfa_totp";//no i18n
		container = isTroubleSignin ? 'verify_totp' : container; // no i18n
		showCommonError(container,I18N.get("IAM.ERROR.GENERAL")); //no i18n
		return false;
	}
	return false;
}
function handleMyZohoDetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			if(successCode === "SI202"||successCode==="MFA302" || successCode==="SI302" || successCode==="SI201"){
				temptoken = jsonStr[signinathmode].token;
				if(isResend){
					verifyCount = 0;
					showResendPushInfo();
					if(isPasswordless && jsonStr[signinathmode].rnd != undefined){
						$("#rnd_num").html(jsonStr[signinathmode].rnd);
						resendpush_checking(time = 25);
					}
					return false;
				}
				isTroubleSignin = false;
				showMzaDevice();
				$(".hellouser").hide();
    			handle_width_Of_Select();
    			$(".devices").click(function(){
    		        hideOABackupRedirection();
    		    })
				var devicedetails = deviceauthdetails[deviceauthdetails.resource_name].modes.mzadevice.data[parseInt(mzadevicepos)];
				$(".tryanother").text(devicedetails.is_active ? I18N.get("IAM.NEW.SIGNIN.TRY.ANOTHERWAY") : I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH.OTHER.OPTION"));
				$(".tryanother").off().on("click",function(){
					devicedetails.is_active ? showTryanotherWay() : showproblemsignin(true);
				});
				prev_showmode = "mzadevice"; // no i18n
				if(!devicedetails.is_active || (typeof jsonStr[signinathmode].is_installed_device !== "undefined" && !jsonStr[signinathmode].is_installed_device)){
					var deviceUnstalled = true;
					showMzaDevice();
					$(".backup_info_content").html(formatMessage(I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH.DESC"),devicedetails.device_name,oneAuthLearnmore));
					window.setTimeout(function (){
						showOABackupRedirection(deviceUnstalled);
					},1000);
				}
				if(prefoption==="totp"){
					$('.step_two').html(I18N.get("IAM.NEW.SIGNIN.RIGHT.PANEL.VERIFY.TOTP"));
					$('.step_three').html(I18N.get("IAM.NEW.SIGNIN.RIGHT.PANEL.ALLOW.TOTP"));
					$('.approved').css('background','url("../images/TOTP_Verify.7413beaafe5ff6a598eeb58a16bad79f.svg") no-repeat transparent');
					$("#mfa_scanqr_container,#mfa_push_container,#waitbtn,#openoneauth").hide();
					enableTOTPdevice(jsonStr,true,false);
	    			$(".rnd_container").hide();
					return false;
				}
				showMzaDevice();
				if(devicedetails){
					$('.secondary_devices').uvselect('destroy');
					$('.secondary_devices').val($('.secondary_devices option')[mzadevicepos].value);
				}
				$(".secondary_devices").off("change");
				isMobile ? mobile_view_Device() : renderUV(".secondary_devices", false, "", "", "", false, false, "Mobile", true, null, null,"value");//no i18n
				$(".secondary_devices").change(function(){
				    changeSecDevice(this);
				}); 
    			if(!($('.secondary_devices option').length > 1 )){
					$('.selectbox_arrow').hide();
				}
    			handle_width_Of_Select();
				if(prefoption === "push" || prefoption==="scanqr" ){
    				var wmsid = jsonStr[signinathmode].WmsId && jsonStr[signinathmode].WmsId.toString();
    				var wmsaccesstoken = jsonStr[signinathmode].WmsAccessToken && jsonStr[signinathmode].WmsAccessToken.toString();
    				isVerifiedFromDevice(prefoption,true,wmsid,wmsaccesstoken);
    			}
    			if(prefoption==="push"){
    				if(isPasswordless && jsonStr[signinathmode].rnd != undefined){
	    				$(".rnd_container").show();
        				$("#rnd_num").html(jsonStr[signinathmode].rnd);
        				$("#waitbtn,.loadwithbtn").hide();
	    				$("#mfa_scanqr_container,#mfa_totp_container,#openoneauth, #qrOneContent, #qrOrLine").hide();
	    				$(".service_name").text(I18N.get("IAM.NEW.SIGNIN.PUSH.RND.DESC"));
	    				$(".loader,.blur").hide();
	    				$(".rnd_resend").show();
	    				resendpush_checking(time = 20);
        			}
    				else{
	    				$("#waitbtn,.loadwithbtn").show();
	    				$(".rnd_container").hide();
	    				$(".waitbtn .waittext").text(I18N.get("IAM.NEW.SIGNIN.WAITING.APPROVAL"));
	    				$("#waitbtn").attr("disabled", true);
	    				$("#mfa_scanqr_container,#mfa_totp_container,#openoneauth, #qrOneContent, #qrOrLine").hide();
	    				$(".loader,.blur").hide();
	    				window.setTimeout(function (){
	        				$(".waitbtn .waittext").text(I18N.get("IAM.PUSH.RESEND.NOTIFICATION"));
	        				$(".loadwithbtn").hide();
	        				$("#waitbtn").attr("disabled", false);
	        				isFormSubmited = false;
	        				return false;
	        				
	    				},20000);
    				}
    			}
    			if(prefoption==="scanqr"){
    				$('.step_two').html(I18N.get("IAM.NEW.SIGNIN.RIGHT.PANEL.ALLOW.SCANQR"));
    				$('.step_three').html(I18N.get("IAM.NEW.SIGNIN.RIGHT.PANEL.VERIFY.SCANQR"));
    				$('.approved').css('background','url("../images/SCANQR_Verify.823be333b83563ed3c9e71e7eaa175e5.svg") no-repeat transparent');
    				signinathmode = jsonStr.resource_name;
    				$("#waitbtn").hide();
    				var qrcodeurl = jsonStr[signinathmode].img;
    				qrtempId =  jsonStr[signinathmode].temptokenid;
    				isValid(qrtempId) ? $("#qrOrLine, #openoneauth, #qrOneContent").show() : $("#qrOrLine, #openoneauth, #qrOneContent").hide();
    				if(isMobile){
    					$('.devices').css('display','none');
    				}
    				$("#mfa_push_container,#mfa_totp_container").hide();
    				$("#qrimg").attr("src",qrcodeurl);//no i18n
    				$(".checkbox_div").addClass("qrwidth");
    			}
    			$(".tryanother").show()
    			var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
    			if(isAMFA){
    				allowedModeChecking();
    				$(".tryanother").hide()
    			}
				isFormSubmited = false;
				signinathmode = callmode === "primary" ? "deviceauth" : "devicesecauth";//no i18N
				$(".loader,.blur").hide();
				oneauthgrant = window.setTimeout(function (){
					showOABackupRedirection(false);
				},45000);
				return false;
			}
		}else{
			var errorcontainer= isPasswordless ? "login_id" : prefoption==="totp"? "mfa_totp": $("#password_container").is(":visible") ? "password" : $("#otp_container").is(":visible") ?"otp" : "yubikey";//no i18n
			errorcontainer = isResend ? "yubikey" : errorcontainer;//no i18N
			errorcontainer === "yubikey" ? $("#yubikey_container").show() : $("#yubikey_container").hide();//no i18N
			var error_resp = jsonStr.errors && jsonStr.errors[0];
			var errorCode = error_resp && error_resp.code;
			if(errorCode === "D105"){
				$('.fed_2show').hide();
				showCommonError(errorcontainer,jsonStr.localized_message); //no i18n
				if (!isRecovery) {allowedModeChecking();}
				return false;
			}
			$('#problemsignin,#recoverybtn').hide();
			if(jsonStr.cause==="throttles_limit_exceeded"){
				showCommonError(errorcontainer,jsonStr.localized_message); //no i18n
				$(".loader,.blur").hide();
				return false;
			}

			if(jsonStr.cause==="pattern_not_matched"){
				changeHip();
				showCommonError("captcha",jsonStr.localized_message);//no i18n
				$(".loader,.blur").hide();
				return false;
			}else if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}
			var error_resp = jsonStr.errors[0];
			var errorCode=error_resp.code;
			var errorMessage = jsonStr.localized_message;
			if(prefoption==="push" || prefoption==="scanqr"){
				showTopErrNotificationStatic(jsonStr.localized_message);
			}else{
				showCommonError(errorcontainer,errorMessage); //no i18n
			}
			$(".loader,.blur").hide();
			return false;
	   }
		
	}else{
		var errorcontainer = signinathmode ==="passwordauth"? "password":"login_id";//no i18n
		showCommonError(errorcontainer,I18N.get("IAM.ERROR.GENERAL")); //no i18n
		return false;
	}
	return false;
}
function showMzaDevice(){
	var headtitle = prefoption ==="push" ? "IAM.NEW.SIGNIN.VERIFY.PUSH" : prefoption === "totp" ? "IAM.NEW.SIGNIN.TOTP" : prefoption === "scanqr" ? "IAM.NEW.SIGNIN.QR.CODE" : "";//no i18N
	var headerdesc = prefoption ==="push" ? "IAM.NEW.SIGNIN.MFA.PUSH.HEADER" : prefoption === "totp" ? "IAM.NEW.SIGNIN.TOTP.HEADER" : prefoption === "scanqr" ? "IAM.NEW.SIGNIN.QR.HEADER":"";//no i18N
	$("#password_container,#login_id_container,#captcha_container,.fed_2show,#recoverybtn,#otp_container").hide();
	isMobile ? $(".deviceparent").show() : $(".deviceparent").hide(); 
	$("#headtitle").text(I18N.get(headtitle));
	$('.devices').css('display','');
	headerdesc = deviceauthdetails[deviceauthdetails.resource_name].isAMFA ? I18N.get(headerdesc) + "<br>" + formatMessage(I18N.get("IAM.NEW.SIGNIN.WHY.VERIFY"),suspisious_login_link) : headerdesc;
	$(".service_name").html(I18N.get(headerdesc));
	$(".product_text,.product_head,.MAppIcon,.OnaAuthHLink,.pwless_head,.pwless_text").hide();
	$("#product_img").removeClass($("#product_img").attr('class'));
	$("#product_img").addClass("tfa_"+prefoption+"_mode");
	$("#forgotpassword,#problemsignin,#recoverybtn").hide();
	$("#nextbtn").hide();
	$("#mfa_"+prefoption+"_container").show();
	$(".service_name").addClass("extramargin");
	$("#mfa_device_container").show();
	$('.signin_container').removeClass('mobile_signincontainer');
	$(".rnd_container").hide();
}
function handleOneAuthDetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
	if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
		var successCode = jsonStr.code;
		if(successCode==="SI302"||successCode==="MFA302"||successCode==="SI202"|| successCode==="SI201"){
			temptoken = jsonStr[signinathmode].token;
			if( 'blockversion' in jsonStr[signinathmode] && jsonStr[signinathmode].blockversion){
				$("#yubikey_container").show();//no i18N
				showCommonError("yubikey",jsonStr.localized_message); // No I18N
			}
			prefoption = deviceauthdetails[deviceauthdetails.resource_name].modes.oadevice.data[oadevicepos].prefer_option;
			var devicemode = prefoption ==="ONEAUTH_PUSH_NOTIF" ? "push" : prefoption === "ONEAUTH_TOTP" ? "totp" : prefoption === "ONEAUTH_SCAN_QR" ? "scanqr" : prefoption === "ONEAUTH_FACE_ID" ? "faceid": prefoption === "ONEAUTH_TOUCH_ID" ? "touch" : "";//no i18N
			if(isResend){
				showResendPushInfo();
				return false;
			}
			var headtitle = prefoption ==="ONEAUTH_PUSH_NOTIF" ? "IAM.NEW.SIGNIN.VERIFY.PUSH" : prefoption === "ONEAUTH_TOTP" ? "IAM.NEW.SIGNIN.TOTP" : prefoption === "ONEAUTH_SCAN_QR" ? "IAM.NEW.SIGNIN.QR.CODE" : prefoption === "ONEAUTH_FACE_ID" ? "IAM.NEW.SIGNIN.FACEID.TITLE": prefoption === "ONEAUTH_TOUCH_ID" ? "IAM.NEW.SIGNIN.TOUCHID.TITLE" : "";//no i18N
			var headerdesc = prefoption ==="ONEAUTH_PUSH_NOTIF" ? "IAM.NEW.SIGNIN.MFA.PUSH.HEADER" : prefoption === "ONEAUTH_TOTP" ? "IAM.NEW.SIGNIN.ONEAUTH.TOTP.HEADER" : prefoption === "ONEAUTH_SCAN_QR" ? "IAM.NEW.SIGNIN.QR.HEADER" : prefoption === "ONEAUTH_FACE_ID" ? "IAM.NEW.SIGNIN.FACEID.HEADER": prefoption === "ONEAUTH_TOUCH_ID" ? "IAM.NEW.SIGNIN.TOUCHID.HEADER":"";//no i18N
			if(isFaceId === true){
				headtitle = "IAM.NEW.SIGNIN.FACEID.TITLE";//No i18N
				headerdesc ="IAM.NEW.SIGNIN.FACEID.HEADER"; //No i18N
				devicemode = "faceid";//no i18N
			}
			$("#password_container,#login_id_container,#captcha_container,.fed_2show,#otp_container,.deviceparent").hide();
			$("#headtitle").text(I18N.get(headtitle));
			$(".service_name").text(I18N.get(headerdesc));
			$(".product_text,.product_head,.MAppIcon,.OnaAuthHLink,.pwless_head,.pwless_text").hide();
			$("#product_img").removeClass($("#product_img").attr('class'));
			$('.devices').css('display','');
			$("#product_img").addClass("tfa_"+devicemode+"_mode");
			$("#forgotpassword").hide();
			$("#nextbtn").hide();
			$("#mfa_"+devicemode+"_container").show();
			$(".service_name").addClass("extramargin");
			$("#mfa_device_container").show();
			if (!isRecovery) {allowedModeChecking();}
			$(".loader,.blur").hide();
			if(devicemode==="push"||devicemode==="touch"|| devicemode==="faceid" ||devicemode === "scanqr"){
				var wmsid = jsonStr[signinathmode].WmsId && jsonStr[signinathmode].WmsId.toString();
				var wmsaccesstoken = jsonStr[signinathmode].WmsAccessToken && jsonStr[signinathmode].WmsAccessToken.toString();
				callmode="secondary";//no i18n
				isVerifiedFromDevice(prefoption,false,wmsid,wmsaccesstoken);
			}
			if(devicemode==="push"||devicemode==="touch"|| devicemode==="faceid"){
				$("#waitbtn").attr("disabled", true);
				$(".waitbtn .waittext").text(I18N.get("IAM.NEW.SIGNIN.WAITING.APPROVAL"));
				$(".loadwithbtn").show();
				$("#waitbtn").show();
				$("#openoneauth, #qrOneContent, #qrOrLine").hide();
				window.setTimeout(function (){
					$(".waitbtn .waittext").text(I18N.get("IAM.PUSH.RESEND.NOTIFICATION"));
					$("#waitbtn").attr("disabled", false);
					$(".loadwithbtn").hide();
					isFormSubmited = false;
					return false;
					
				},20000);
			}
			if(devicemode==="scanqr"){
				var qrcodeurl = jsonStr[signinathmode].img;
				qrtempId =  jsonStr[signinathmode].temptokenid;
				isValid(qrtempId) ? $("#openoneauth, #qrOneContent, #qrOrLine").show() : $("#openoneauth, #qrOneContent, #qrOrLine").hide();
				$("#qrimg").attr("src",qrcodeurl);//no i18n
				$(".checkbox_div").addClass("qrwidth");
			}
			isFormSubmited = false;
			return false;
			}
		}
		else{
			var errorcontainer= (prefoption==="totp"||prefoption==="ONEAUTH_TOTP") ? "mfa_totp": "yubikey";//no i18n
			errorcontainer === "yubikey" ? $("#yubikey_container").show() : $("#yubikey_container").hide();//no i18N
			var error_resp = jsonStr.errors[0];
			var errorCode = error_resp.code;
			if(errorCode === "D105"){
				showCommonError(errorcontainer,jsonStr.localized_message); //no i18n
				$('.fed_2show').hide();
				if (!isRecovery) {allowedModeChecking();}
				return false;
			}else if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}
			if(jsonStr.cause==="throttles_limit_exceeded"){
				showCommonError(errorcontainer,jsonStr.localized_message); //no i18n
				return false;
			}
			showCommonError(errorcontainer,jsonStr.localized_message); //no i18n
			return false;
		}
		return false;
	}else{
		var errorcontainer = signinathmode ==="passwordauth"? "password":"login_id";//no i18n
		showCommonError(errorcontainer,I18N.get("IAM.ERROR.GENERAL")); //no i18n
		return false;
	}
	return false;
}
function handlePassphraseDetails(resp){
	if(IsJsonString(resp)) {
		$("#backupVerifybtn span").removeClass("zeroheight");
		$("#backupVerifybtn").removeClass('changeloadbtn');
		$("#backupVerifybtn").attr("disabled", false);
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			var statusmsg = jsonStr.passphrasesecauth.status;
			if(statusmsg==="success"){
				if(restrictTrustMfa){
					updateTrustDevice(false);
					return false;
				}
				showTrustBrowser();
				return false;
			}else if(successCode==="P500"||successCode==="P501"||successCode==="P506"){//no i18N
				temptoken = jsonStr[signinathmode].token;
				showPasswordExpiry(jsonStr[signinathmode].pwdpolicy, successCode);
				return false;
			}
			else{
				showCommonError("passphrase",jsonStr.localized_message);//no i18n
				return false;
			}
		}else{
			if(jsonStr.cause==="throttles_limit_exceeded"){
				showCommonError("passphrase",jsonStr.localized_message); //no i18n
				return false;
			}
			var error_resp = jsonStr.errors && jsonStr.errors[0];
			var errorCode= error_resp && error_resp.code;
			if(errorCode==="IN107" || errorCode === "IN108"){
				$(".fed_2show,.line").hide();
				cdigest=jsonStr.cdigest;
				showHip(cdigest, 'bcaptcha_img'); //no i18N
				$("#bcaptcha_container").show();
				$("#bcaptcha").focus();
				clearCommonError('bcaptcha');//no i18N
				changeButtonAction(I18N.get("IAM.NEW.SIGNIN.VERIFY"),false);
				if( errorCode === "IN107"){
					showCommonError("bcaptcha",errorMessage); //no i18n	
				}
				return false;
			}else if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}
			showCommonError("passphrase",jsonStr.localized_message);//no i18n
			return false;
		}
	}
}
function resendpush_checking(resendtiming){
	clearInterval(resendTimer);
	$('.rnd_resend').addClass('nonclickelem');
	$('.rnd_resend').html(I18N.get('IAM.NEW.SIGNIN.RESEND.PUSH.COUNTDOWN'));
	$('.rnd_resend span').text(resendtiming);
	resendTimer = setInterval(function(){
		resendtiming--;
		$('.rnd_resend span').text(resendtiming);
		if(resendtiming === 0) {
			clearInterval(resendTimer);
			$('.rnd_resend').html(I18N.get('IAM.NEW.SIGNIN.RESEND.PUSH'));
			$('.rnd_resend').removeClass('nonclickelem');
		}
	},1000);
}
var wmscount =0;
var _time;
var verifyCount = 0;
var totalCount = 0;
var isWmsRegistered=false;
var wmscallmode,wmscallapp,wmscallid,wmscallaccesstoken;
function isVerifiedFromDevice(prefmode,isMyZohoApp,WmsID,wmsAccessToken) {
	if(isWmsRegistered === false && isValid(WmsID) && WmsID != "undefined" && isValid(wmsAccessToken) && wmsAccessToken != "undefined") {
		wmscallmode=prefmode;wmscallapp=isMyZohoApp;wmscallid=WmsID;wmscallaccesstoken=wmsAccessToken;
		try {
			WmsLite.setClientSRIValues(wmsSRIValues);
			WmsLite.setNoDomainChange();
			if(window.crossOriginIsolated){
				WmsLite.enableCrossOriginIsolation();
			}
			WmsLite.registerAnnon('AC', WmsID, 'AnnonUser', false, wmsAccessToken); // NO I18N
	 		isWmsRegistered=true;
	 		
	 	} catch (e) {
		//no need to handle failure
	 	}
	}
	prefmode = prefmode === undefined ? wmscallmode:prefmode;
    isMyZohoApp = isMyZohoApp === undefined ? wmscallapp : isMyZohoApp;
    WmsID = WmsID === undefined ? wmscallid : WmsID;
    wmsAccessToken = wmsAccessToken === undefined ? wmscallaccesstoken : wmsAccessToken;
	clearInterval(_time);
	if(verifyCount > 15) {
   		return false;
   	}
	var loginurl = isMyZohoApp ? uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/device/"+deviceid+"?":uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/oneauth/"+deviceid+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams+"&polling="+true ; //no i18N
	var jsonData = {'oneauthsec':{'devicepref':prefmode }};//no i18N
	if(isMyZohoApp){
		jsonData = callmode==="primary" ? {'deviceauth':{'devicepref':prefmode }} : {'devicesecauth':{'devicepref':prefmode }};//no i18N
		var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
		jsonData =  callmode !="primary" && isAMFA ? {'devicesecauth':{'devicepref':prefoption, "isAMFA" : true }}  : jsonData; // no i18n
	}
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),false,VerifySuccess,"PUT");//No i18N
	verifyCount++;
	if(isValid(WmsID) && WmsID!="undefined" && isValid(wmsAccessToken) && wmsAccessToken != "undefined") {
		wmscount++;
		var callIntervalTime = wmscount < 6 ? 5000 : 25000;
		_time = setInterval(function() {
			isVerifiedFromDevice(prefmode,isMyZohoApp,WmsID,wmsAccessToken);
		}, callIntervalTime);
		return false;
	}else{
		_time = setInterval(function() {
			isVerifiedFromDevice(prefmode,isMyZohoApp,WmsID,wmsAccessToken);
		}, 3000);
	}
	return false;
}
function VerifySuccess(res) {
	if(IsJsonString(res)) {
		var jsonStr = JSON.parse(res);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			var statusmsg = jsonStr[signinathmode].status;
			if(successCode === "SI302"|| successCode==="SI200" ||successCode === "SI300" || successCode === "SI301" || successCode === "SI303" || successCode === "SI305" || successCode === "SI507" || successCode === "SI509"  || successCode === "SI506"){
				switchto(jsonStr[signinathmode].redirect_uri);
				return false;
			}
			else if(statusmsg==="success"){
				clearInterval(_time);
				if(restrictTrustMfa){
					updateTrustDevice(false);
					return false;
				}
				showTrustBrowser();
				return false;
			}
			else if(successCode==="P500"||successCode==="P501"||successCode==="P506"){
				temptoken = jsonStr[signinathmode].token;
				showPasswordExpiry(jsonStr[signinathmode].pwdpolicy, successCode);
				return false;
			}
		} else if(statusCode == "500") {
			var error_resp = jsonStr.errors && jsonStr.errors[0].code;
			if(error_resp && error_resp !=  "D103" && error_resp !=  "D112" && !jsonStr.is_active){
				var devicedetails = deviceauthdetails[deviceauthdetails.resource_name].modes;
				var devicename = devicedetails.mzadevice.data && devicedetails.mzadevice.data[parseInt(mzadevicepos)].device_name;
				$(".backup_info_content").html(formatMessage(I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH.DESC"),devicename,oneAuthLearnmore));
				showOABackupRedirection(true);
				return false;
			}
			if(error_resp == "Y401") {
				if(isPasswordless){
					showTopErrNotification(I18N.get("IAM.SIGNIN.ERROR.YUBIKEY.VALIDATION.FAILED"));
					return false;
				}else if(error_resp === "R303"){ //no i18N
					showRestrictsignin();
					return false;
				}
				showCommonError("yubikey",I18N.get("IAM.SIGNIN.ERROR.YUBIKEY.VALIDATION.FAILED")); //no i18n	
				$("#yubikey_container").show();
				showError();
			}
		}
 	}
	return false;
}
function handleSecondaryDevices(primaryMode){
	if(primaryMode === "oadevice" || primaryMode === "mzadevice"){
		$('.secondary_devices').find('option').remove().end();
		var deviceDetails = deviceauthdetails[deviceauthdetails.resource_name].modes;
		var isSecondaryDevice = false;
		var optionElem = '';
		secondaryMode = "oadevice"; //no i18n
		if(primaryMode == "oadevice") {
			secondaryMode = "mzadevice"; // no i18n
		}
		if(deviceDetails[primaryMode]){
			var oneauthdetails = deviceDetails[primaryMode].data;
			if(oneauthdetails[0].prefer_option != "push"){
				optionElem += "<option value='0' version='"+oneauthdetails[0].app_version+"'>"+oneauthdetails[0].device_name+"</option>";
				isSecondaryDevice = true;
			}else{
				oneauthdetails.forEach(function(data,index){
					optionElem += "<option value="+index+" version='"+data.app_version+"'>"+data.device_name+"</option>";
					isSecondaryDevice = true;
				});
			}
		}
		if(deviceDetails[secondaryMode]){
			var oneauthdetails = deviceDetails[secondaryMode].data;
			if(oneauthdetails[0].prefer_option != "push"){
				optionElem += "<option value='0' version='"+oneauthdetails[0].app_version+"'>"+oneauthdetails[0].device_name+"</option>";
				isSecondaryDevice = true;
			}else{
				oneauthdetails.forEach(function(data,index){
					optionElem += "<option value="+index+" version='"+data.app_version+"'>"+data.device_name+"</option>";
					isSecondaryDevice = true;
				});
			}
		}
		document.getElementsByClassName('secondary_devices')[0].innerHTML = optionElem; // no i18n
		if(isSecondaryDevice){
			try { 
				$(".secondary_devices").off("change");
				isMobile ? mobile_view_Device() : renderUV(".secondary_devices", false, "", "", "", false, false, "Mobile", true, null, null,"value");//no i18n
				$(".secondary_devices").change(function(){
				    changeSecDevice(this);
				});
				prevoption = $(".secondary_devices").children("option:selected").val();
				if(!($('.secondary_devices option').length > 1 )){
					$('.selectbox_arrow').hide();
				}
				window.setTimeout(function(){
					$('.devices .select2').addClass("device_select");
					$('.devices .select2').show();
					$('.devices .select2-selection--single').addClass('device_selection');
					$('.devicedetails').hide();
					$(".select2-selection__arrow").addClass("hide");
					if(!($('.secondary_devices option').length > 1 )){
						$('.downarrow').hide();
						$('.devices').css("pointer-events", "none");
					}
				},100);
			}catch(err){
				$('.secondary_devices').css('display','block');
				if(!($('.secondary_devices option').length > 1 )){
					$('.secondary_device').css("pointer-events", "none");
				}
				$('option').each(function() {
					if(this.text.length > 20){
						var optionText = this.text;
						var newOption = optionText.substring(0, 20);
						$(this).text(newOption + '...');
					}
				});
			}
		}
	}
}
function mobile_view_Device(){
	$(".devicetext").html($(".secondary_devices").find(":selected")[0].innerHTML).show();
	$(".deviceparent").css("width","fit-content").css("margin","auto").css("max-width","200px").css("border","1px solid #CECECE").css("border-radius","6px").css("padding","8px 18px").css("direction","ltr").show();//no i18n
	if($(".secondary_devices option").length == 1){
		$(".mobile_dev_arrow").hide();
	}
	handle_width_Of_Select();
}
function handle_width_Of_Select(){
	var direction = $("body").attr("dir") === "rtl" ? "margin-right" : "margin-left";//no i18n
	$(".secondary_devices").css("width",$(".deviceparent").outerWidth()).css(direction,$(".deviceparent").css("margin-left"));//no i18n
	$(".secondary_devices option").css("width",$(".deviceparent").outerWidth());
}
function secondaryFormat(option){
	return "<div><span class='icon-device select_icon'></span><span class='select_con' value="+$(option.element).attr("value")+" version="+$(option.element).attr("version")+">"+option.text+"</span></div>";
}
function showMoreSigninOptions(listoutallmode){
	listoutallmode ? showproblemsignin(true,false,true) : showproblemsignin(true);
	showCantAccessDevice();
	$('.problemsignin_head,.recoveryhead .backoption').hide();
	allowedmodes.indexOf("recoverycode") != -1 ? $('#recoverOption').show() : $('#recoverOption').hide();
	allowedmodes.indexOf("passphrase") != -1 ? $('#passphraseRecover').show() : $('#passphraseRecover').hide();
	$(".rec_head_text").html(I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY')+"<div class='oa_head_con'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY.DESC')+"</div></div>");
	$('.backuphead .backoption').hide();
	$('.recoveryhead .backoption').css("cssText", "display: none !important;");
	$('#recoverymodeContainer').html($('.problemsignincon').html() ? $('.problemsignincon').html()+$('.recoverymodes').html() : $('.recoverymodes').html());
	$('.showBackupVerificationCode').click(function() {
		showBackupVerificationCode();
	});
	$('#passphraseRecover').click(function() {
		showPassphraseContainer();
	});
	$('.showCurrentMode').on('click', function() {
		isPasswordless ? showAlterVerificationINfo($(this).attr("mode")) : showCurrentMode($(this).attr("mode"),parseInt($(this).attr("index")));
	});
	$('.recoverymodes,.contact_support').hide();
	$(".contactSupport").show();
	if($('#recoverymodeContainer').children().length - !$('#recoverOption').is(":visible") - !$('#passphraseRecover').is(":visible")  > 3 && !isMobile){
		$('#recoverymodeContainer').addClass('problemsignincontainer');
	}
	if(oaNotInstalled){
		$("#recoverymodeContainer,.contactSupport").show();
	    $(".contactSupportDesc,.mailbox,.supportSLA,#FAQ").hide(); 
	}
	isRecovery= listoutallmode ? true : false; 
	isPasswordless = false;
}

function generateOTP(isResendOnly,mode,captchavalue){	
	if(typeof mode !== 'undefined' && isResendOnly){
		mode = prev_showmode; 
	}
	mode = (mode && mode.toLowerCase() == "email" ) ? "EMAIL" : "MOBILE";//No i18n
	if(isResendOnly){
		$('.resendotp').addClass("sendingotp");//no i18N
		$('.resendotp').text(I18N.get((typeof(isArattai) != "undefined" && isArattai)?"IAM.SENDING.CODE":"IAM.NEW.GENERAL.SENDING.OTP"));//no i18N
	}
	if(isPrimaryMode){
		generateOTPAuth(isResendOnly,mode,captchavalue);
		return false;
	}
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/otp/"+emobile;//no i18N
	var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA; 
	var callback = prev_showmode == "email" ? enableOTPForEmail : enableOTPDetails; // no i18n
	if(isResendOnly){
		loginurl += "?digest="+digest+ "&" + signinParams; //no i18N
		var jsonData = isAMFA ? { "otpsecauth" : { 'mdigest' : mdigest, 'is_resend' : true, 'isAMFA' : true , 'mode' : mode }} : { "otpsecauth" : { 'mdigest' : mdigest, 'is_resend' : true , 'mode' : mode }};//no i18N
		sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,showResendInfo,"PUT");//no i18n
		return false;		
	}else{
		loginurl += "?digest="+digest+ "&" + signinParams; //no i18N
		if(captchavalue){loginurl += "&captcha=" +captchavalue+"&cdigest="+cdigest;}
		var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
		var jsonData = isAMFA ? { "otpsecauth" : { 'isAMFA' : true , 'mode' : mode }} : { "otpsecauth" : { 'mode' : mode }};//no i18N
		sendRequestWithTemptoken(loginurl, JSON.stringify(jsonData) ,true,callback );	
	}
	
	return false;
}
function generateOTPAuth(isResendOnly,mode,captchavalue){
	var emailID = $("#emailcheck").val() ? $("#emailcheck").val().trim() : "";
	if($("#emailcheck_container").is(":visible")  && (!isValid(emailID) || !isEmailIdSignin(emailID))){
		!isValid(emailID) ? showCommonError("emailcheck",I18N.get("IAM.NEW.SIGNIN.ENTER.EMAIL.ADDRESS")) : showCommonError("emailcheck",I18N.get("IAM.NEW.SIGNIN.INVALID.LOOKUP.EMAIL"));//no i18n
		return false;
	}
	var otpMediumPrefix = !isResendOnly && mode == "MOBILE" && deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].medium && deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].medium.indexOf("arattai") != -1 ? "ar" : "" ;//no i18N
	!isResendOnly && typeof(isArattai) != "undefined" && isArattai && $(".loader,.blur").show();// no i18n
	var loginurl = uriPrefix + "/signin/v2/" + callmode + "/" + zuid + "/"+otpMediumPrefix+"otp/" + emobile + "?digest=" + digest + "&" + signinParams;//no i18N
	if (captchavalue) { loginurl += "&captcha=" + captchavalue + "&cdigest=" + cdigest; };
	var callback = isResendOnly ? showResendInfo : enableOTPDetails;
	callback = $("#emailcheck_container").is(":visible") ? enableEmailOTPDetails : callback;
	var jsonData = {};
	if (isValid(emailID)) {
		jsonData = { "otpauth": { "email_id": emailID, 'mode': mode } };// no i18n
	} else {
		jsonData[otpMediumPrefix+"otpauth"] = { "mode": mode };// no i18n
	}
	var jsonDataResend = isResendOnly && $("#emailverify_container").is(":visible") ? { "otpauth": { "is_resend": true, "email_id": emailID, 'mode': mode } } : { "otpauth": { "is_resend": true, 'mode': mode } }; // no i18n
	var encryptionJson = {
		path : 'otpauth.email_id', // no i18n
		value : emailID
	}
	isArattaiSmsCodeSent = isResendOnly && typeof isArattai !== "undefined" && isArattai;// no i18n
	!isResendOnly ? sendRequestWithTemptoken(loginurl, JSON.stringify(jsonData), true, callback, undefined, encryptionJson, emailID) : sendRequestWithTemptoken(loginurl, JSON.stringify(jsonDataResend), true, callback, undefined, encryptionJson, emailID)
	return false;
}
var PriotpThreshold = 3;
function showResendInfo(resp){
	var elem = $("#mfa_otp").is(":visible") ? "mfa_otp" : $("#mfa_email").is(":visible")? "mfa_email": $("#otp").is(":visible") ? "otp" : $("#emailverify").is(":visible") ? "emailverify": undefined ;//no i18n
	if(elem != undefined){$("#"+elem).click()}
	if(resendcheck>=0){
		if(IsJsonString(resp)) {
			var jsonStr = JSON.parse(resp);
			signinathmode = jsonStr.resource_name;
			var statusCode = jsonStr.status_code;
			if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
				if(typeof(isArattai) != "undefined" && isArattai && de("arattaiOtpScreenHeader")){
					$("#arattaiOtpScreenHeader .otpDesc").html(I18N.get("IAM.SMS.OTP.SCREEN.DESC"))
				}
				var successCode = jsonStr.code;
				if(successCode === "SI201"|| successCode==="SI200" ){
					mdigest = jsonStr[signinathmode].mdigest;
					showTopNotification(formatMessage(I18N.get(isArattaiSmsCodeSent ? "IAM.CODE.SENT.SMS" : "IAM.NEW.SIGNIN.OTP.SENT.RESEND"),rmobile))
					callmode === 'primary' ? PriotpThreshold-- : (MFAotpThresholdmob != undefined && prev_showmode === "otp") ? MFAotpThresholdmob-- : (AMFAotpThreshold != undefined && prev_showmode === "email") ? AMFAotpThreshold-- :"";// no i18n
					resendotp_checking();
					if(allowedmodes.indexOf("recoverycode") != -1){
						setTimeout(function(){
							if($("#mfa_otp_container").is(":visible")){$(".go_to_bk_code_container").addClass("show_bk_pop"); $(".go_to_bk_code_container").show();};
						},30000);
						
					}
					return false;
				
					
				}
			}else{
				if(jsonStr.cause==="throttles_limit_exceeded"){
					if(isPrimaryDevice){
						showTopErrNotification(jsonStr.localized_message);
						return false;
					}
					elem ? showCommonError(elem ,jsonStr.localized_message) : showTopErrNotification(jsonStr.localized_message);
					return false;
				}
				var error_resp = jsonStr.errors && jsonStr.errors[0];
				var errorCode= error_resp && error_resp.code;
				var errorMessage = jsonStr.localized_message;
				if(errorCode==="IN107" || errorCode === "IN108"){
					cdigest=jsonStr.cdigest;
					showHip(cdigest); //no i18N 
					showCaptcha(I18N.get("IAM.NEXT"),false,"otp");//no i18N
					if( errorCode === "IN107"){
						showCommonError("captcha",errorMessage); //no i18n	
					}
					return false;
				}
				else if(errorCode === "R303"){ //no i18N
					showRestrictsignin();
					return false;
				}
				else{
					showCommonError("otp",errorMessage); //no i18n
					return false;	
				}
				
			}
		}
	}
	
	return false;
	
}
function enableOTPDetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			if(successCode === "SI201"|| successCode==="SI200" ){
				$(".loader,.blur").hide();
				mdigest = jsonStr[signinathmode].mdigest;
				isSecondary = deviceauthdetails[deviceauthdetails.resource_name] && deviceauthdetails[deviceauthdetails.resource_name].modes.otp && deviceauthdetails[deviceauthdetails.resource_name].modes.otp.count > 1 || (allowedmodes.length >1 && allowedmodes.indexOf("recoverycode") === -1) ? true : false; // no i18n
				hideCaptchaContainer();
				if(signinathmode === "otpauth" || signinathmode === "arotpauth"){
					clearCommonError("otp"); // no i18n
					$('#login').show();
					$("#emailcheck_container").hide();
					$("#emailcheck").val("");
					// Temporarily handled timeout as 10000 (10 sec) for persisting OTP sent message, since it is not conveyed with existing timeout when OTP is sent to different mode.
					showTopNotification(formatMessage(I18N.get(signinathmode === "arotpauth"? "IAM.CODE.SENT.ARATTAI" : "IAM.NEW.SIGNIN.OTP.SENT"),rmobile), 10000);
					resendotp_checking();
					showOtpDetails();
					if(!isPasswordless){
						fallBackForSingleMode(prev_showmode,validateAllowedMode(prev_showmode).option);
					}
					$(".resendotp").show();
					if(typeof(isArattai) != "undefined" && isArattai && de("arattaiOtpScreenHeader")){
						var otpSentMedium = signinathmode === "arotpauth" ? "ARATTAI" :"SMS";// no i18n
						$("#arattaiOtpScreenHeader .otpDesc").html(I18N.get("IAM."+otpSentMedium+".OTP.SCREEN.DESC"));
						$(".signin_head").hide()
						$('#otp').attr('placeholder', I18N.get("IAM.ENTER.CODE"));
						$("#resendforotp").removeClass("bluetext_action_right").addClass("bluetext_action_left");
					}
					return false;	
				}
				if(!isValid(digest)){
					digest = jsonStr[signinathmode].mdigest;					
				}
				enableMfaField("otp");//no i18N
				resendotp_checking();
				return false;
			}
			return false;
		}
		else{
			$(".blur,.loader").hide();
			var error_resp = jsonStr.errors && jsonStr.errors[0];
			var errorCode= error_resp && error_resp.code;
			if(errorCode==="IN107" || errorCode === "IN108"){
				showCaptchaContainer(jsonStr);
				cdigest = jsonStr.cdigest;
				showHip(cdigest);
				return false;
			}
			if(errorCode == "AS115"){
				showOtpDetails();
				showCommonError("otp",jsonStr.localized_message);//no i18n
				$("#otp").blur();
				$(".resendotp").hide();
				if(!isPasswordless){
					fallBackForSingleMode(prev_showmode,validateAllowedMode(prev_showmode).option);
				}
				return false;
			}
			if(!isPasswordless){
				fallBackForSingleMode(prev_showmode,validateAllowedMode(prev_showmode).option);
			}
			var errorfield = $("#emailcheck_container").is(":visible")  ? "emailcheck" : "password"; //no i18n
			if(jsonStr.cause==="throttles_limit_exceeded"){
				if($("#problemsigninui").is(":visible")){
					$('#enablemore').hide()
				}
				$("#"+errorfield).is(":visible") ? showCommonError(errorfield ,jsonStr.localized_message) : showTopErrNotification(jsonStr.localized_message); 
				return false;
			}
			$("#"+errorfield).is(":visible") ? showCommonError(errorfield ,jsonStr.localized_message) : showTopErrNotification(jsonStr.localized_message);
			return false;
		}
	}
	showTopErrNotification(I18N.get("IAM.ERROR.GENERAL"));
	return false;
}
function btnAllowedModes(){
	var bBtnAllowedModes = allowedmodes.length;
	allowedmodes.forEach(function(usedmode){
		if(usedmode=="saml" || usedmode=="federated" || usedmode=="jwt" || usedmode=="mzadevice" || usedmode=="oidc"){bBtnAllowedModes--}
	});
	return bBtnAllowedModes;
}
function showSigninUsingFedOption(){
	if(typeof(allowedmodes) === "undefined"){return false}
	if(allowedmodes.indexOf("oidc") != -1 || allowedmodes.indexOf("jwt") != -1|| allowedmodes.indexOf("federated") != -1 || allowedmodes.indexOf("saml") != -1){
		$(".fed_2show").show();
		if(!isLargeFedIcons){
			$(".large_box").removeClass("large_box");
			$(".fed_div").addClass("small_box");
			$(".fed_text").hide();
			$(".googleIcon").removeClass("google_small_icon");	
		}
		$(".fed_div").hide();
		document.getElementById("fed_signin_options").innerHTML="";
	}
	if (allowedmodes.indexOf("federated") != -1){
		var idps = deviceauthdetails.lookup.modes.federated.data;
		idps.forEach(function(idps){
			if(isValid(idps)){
				idp = idps.idp.toLowerCase();
				$("."+idp+"_fed").attr("style","display:block !important");
				if(isLargeFedIcons){
					$("."+idp+"_fed").addClass("large_box").removeClass("small_box");	
				}
            }
		});
		if($(".apple_fed").is(":visible")){
			if(!isneedforGverify) {
				$(".apple_fed").hide();
				$("#macappleicon").show();
		    	$(".googleIcon").addClass("google_small_icon");
			}else{$("#macappleicon").hide();}
		}
		if(!isLargeFedIcons){
			isneedforGverify ? $(".google_icon .fed_text").show(): $(".google_icon .fed_text").hide();	
		}
		
	}
	if(allowedmodes.indexOf("jwt") != -1){
		if(deviceauthdetails.lookup.modes.jwt && deviceauthdetails.lookup.modes.jwt.count > 1){
			var jwtCount = deviceauthdetails.lookup.modes.jwt.count;
			for(var i = 0; i < jwtCount; i++){
				appendJWT(i)
			}
		}else{appendJWT(0)}
	}
	if(allowedmodes.indexOf("oidc") != -1){
		if(deviceauthdetails.lookup.modes.oidc && deviceauthdetails.lookup.modes.oidc.count > 1){
			var oidcCount = deviceauthdetails.lookup.modes.oidc.count;
			for(var i = 0; i < oidcCount; i++){
				appendOIDC(i)
			}
		}else{appendOIDC(0)}
	}
	if(allowedmodes.indexOf("saml") != -1){
		if(deviceauthdetails.lookup.modes.saml && deviceauthdetails.lookup.modes.saml.count > 1){
			var samlCount = deviceauthdetails.lookup.modes.saml.count;
			for(var i = 0; i < samlCount; i++){
				appendSAML(i)
			}
		}else{appendSAML(0)}
	}
	$(".large_box:visible").addClass("signin-mode").filter(":odd").css("margin-right", "0px");	//No I18N
	setFooterPosition();
}
function enableOTPForEmail(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			AMFAotpThreshold=3;
			var successCode = jsonStr.code;
			$(".loader,.blur").hide();
			mdigest = jsonStr[signinathmode].mdigest;
			oldsigninathmode = oldsigninathmode ? oldsigninathmode : signinathmode; 
			goBackToProblemSignin();
			var emaillist = deviceauthdetails[deviceauthdetails.resource_name].modes && deviceauthdetails[deviceauthdetails.resource_name].modes.email;
			isSecondary = emaillist && emaillist.count > 1 || (allowedmodes.length >1 && allowedmodes.indexOf("recoverycode") === -1);
			$("#password_container,#captcha_container,.fed_2show,#otp_container").hide();
			$("#headtitle").text(I18N.get("IAM.AC.CHOOSE.OTHER_MODES.EMAIL.HEADING"));
			$(".service_name").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.OTP.HEADER"),rmobile)+"<br>"+formatMessage(I18N.get("IAM.NEW.SIGNIN.WHY.VERIFY"),suspisious_login_link));
			$("#product_img").removeClass($("#product_img").attr('class'));
			$("#product_img").addClass("tfa_otp_mode");
			showTopNotification(formatMessage(I18N.get("IAM.NEW.SIGNIN.OTP.SENT"),rmobile));
			if(!isClientPortal){enableSplitField("mfa_email",otp_length,I18N.get("IAM.VERIFY.CODE"))}
			$("#mfa_email_container,#mfa_email_container .textbox_actions").show();//no i18N
			$("#forgotpassword").hide();
			$(".service_name").addClass("extramargin");
			$("#nextbtn span").removeClass("zeroheight");
			$("#nextbtn").removeClass("changeloadbtn");
			$("#nextbtn").attr("disabled", false);
			$("#nextbtn span").text(I18N.get("IAM.NEW.SIGNIN.VERIFY"));
			if(isClientPortal){$('#mfa_email').focus()}
			isFormSubmited = false;
			callmode="secondary";//no i18n
			resendotp_checking();
			allowedModeChecking();
			if(!isValid(digest)){
				digest = jsonStr[signinathmode].mdigest;					
			}
			signinathmode = jsonStr.resource_name;
			return false;
		}
		else{
			if(triggeredUser){
				showTopErrNotification(jsonStr.localized_message);
				return false;
			}
			if(jsonStr.cause==="throttles_limit_exceeded"){
				showCommonError("password",jsonStr.localized_message);  // no i18n
				return false;
			}
			var errorMessage = jsonStr.localized_message;
			showCommonError("password",errorMessage);  // no i18n
			return false;
		}
	}
	return false;
}
function resendotp_checking(){
	var resendtiming = 60;
	clearInterval(resendTimer);
	var isArattaiOTPSent = typeof(isArattai) != "undefined" && isArattai && deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].medium && deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].medium.indexOf("arattai") != -1 ? true : false;// no i18n
	var countDownText = !isArattaiOTPSent || isArattaiSmsCodeSent ? "IAM.TFA.RESEND.OTP.COUNTDOWN" : "IAM.GET.CODE.COUNTDOWN.VIA.SMS";// no i18n
	var resendText = isArattaiOTPSent && !isArattaiSmsCodeSent ? "IAM.NEW.SIGNIN.RESEND.OTP.VIA.SMS" : "IAM.NEW.SIGNIN.RESEND.OTP";// no i18n
	if($('.resendotp').hasClass('sendingotp')){$('.resendotp').removeClass('sendingotp');}
	$('.resendotp').addClass('nonclickelem');
	$('.resendotp span').text(resendtiming);
	resendcheck = callmode === "primary" ? PriotpThreshold : (MFAotpThresholdmob != "undefined" && prev_showmode === "otp") ? MFAotpThresholdmob : (AMFAotpThreshold != "undefined" && prev_showmode === "email") ? AMFAotpThreshold :'';// no i18n
	var attemptContent = (resendcheck == 0 && callmode === "primary") ? 'IAM.SIGNIN.OTP.THRESHOLD.LIMIT.ENDS' : (resendcheck == 0 && callmode != "primary") ? 'IAM.SIGNIN.OTP.MAX.COUNT.MFA.LIMIT.ENDS' : "" ;//no i18n 
	if(resendcheck <= 2 && resendcheck >=0){
		$('.resendotp').html(I18N.get(countDownText)); 
		if(resendcheck == 0){$('.resendotp').html(I18N.get(attemptContent));return false}// no i18n}
	}else{
		$('.resendotp').html(I18N.get(countDownText));
	}
	resendTimer = setInterval(function(){
		resendtiming--;
		$('.resendotp span').text(resendtiming);
		if(resendtiming === 0) {
			clearInterval(resendTimer);
			$('.resendotp').html(I18N.get(resendText));
			$('.resendotp').removeClass('nonclickelem');
		}
	},1000);
}

function changeRecoverOption(recoverOption){
	recoverOption === "passphrase" ? showPassphraseContainer() : showBackupVerificationCode(); //no i18n
	if(recoverOption === "passphrase"){
		recoverTitle = I18N.get("IAM.NEW.SIGNIN.PASSPHRASE.RECOVER.TITLE");
		recoverHeader = I18N.get("IAM.NEW.SIGNIN.PASSPHRASE.RECOVER.HEADER");
	}else if(recoverOption === "recoverycode"){ // no i18n
		recoverTitle = I18N.get("IAM.BACKUP.VERIFICATION.CODE");
		recoverHeader = I18N.get("IAM.NEW.SIGNIN.BACKUP.RECOVER.HEADER");
	}
	$('#backup_container #backup_title').text(recoverTitle);
	$('#backup_container .backup_desc').text(recoverHeader);
	$("#backup_container .backoption").hide();
}
function showError(){
	$(".waitbtn .waittext").text(I18N.get("IAM.EXCEPTION.RELOAD"));
	$(".waittext").css("waittext","0px"); //no i18n
	$(".loadwithbtn").hide();
	$("#waitbtn").attr("disabled", false);
	isFormSubmited = false;
	return false;
}
function showMoreIdps(){
	$("#showIDPs, .zohosignin").attr('aria-expanded', true);
	$("#login,.line").hide();
	$(".small_box").removeClass("small_box");
    $(".fed_div").addClass("large_box view_all_fed");
    $(".fed_text,.fed_2show").show();
	$(".zohosignin").removeClass("hide");
	$("#showIDPs").hide();
	$(".fed_div").show();
	$(".more").hide();
	$(".signin_container").css("height","auto");//no i18n
	$(".intuiticon").removeClass("icon-intuit_small")
	$(".intuit_icon,.intuit_icon .fed_center").removeClass("intuit_fed");
	$("#fed_large_title").show();
	$(".signin_fed_text").hide();
	$("#signuplink").hide();
	setFooterPosition();
	if(!isneedforGverify) {
		$(".fed_center_google").css("width","max-content");
		$(".googleIcon").removeClass("google_small_icon");
		$(".apple_fed").hide();
		$("#macappleicon").show();
		return false; 
	}
	$("#macappleicon").hide();
 }
function showZohoSignin(){
	$("#showIDPs, .zohosignin").attr('aria-expanded', false);
	$("#login").show();
	if(!isMobile){$(".line").show();}
	$(".zohosignin").addClass("hide");
	$(".fed_text,.fed_div").hide();
	$(".signin_fed_text").removeClass("signin_fedtext_bold");
	$(".more,.show_fed").show();
	if(de("login_id")){
   		$('#login_id').focus();
   	 }
	$(".large_box").removeClass("large_box view_all_fed");
    $(".fed_div").addClass("small_box");
    $(".intuiticon").addClass("icon-intuit_small")
	$(".intuit_icon,.intuit_icon .fed_center").removeClass("intuit_fed");
	$("#fed_large_title").hide();
	$(".signin_fed_text").show();
	$("#signuplink").show();
    fediconsChecking();
 }
function showHidePassword(fieldID){
	var passwordField = isValid(fieldID) ? fieldID : "#password";//no i18N
 	passwordField = $("#passphrase").is(":visible") ? "#passphrase" :passwordField; // no i18n
	 var passType = $(passwordField).attr("type");//no i18n
	 
	 if(passType==="password"){
		$(passwordField).attr("type","text");//no i18n
		fieldID ? $(fieldID+"~ .show_hide_Confpassword").addClass("icon-show").removeClass("icon-hide"):$(".show_hide_password").addClass("icon-show").removeClass("icon-hide");
	 }else{
		$(passwordField).attr("type","password");//no i18n
		fieldID ? $(fieldID+" ~ .show_hide_Confpassword").removeClass("icon-show").addClass("icon-hide") : $(".show_hide_password").removeClass("icon-show").addClass("icon-hide");
	 }
	 $(passwordField).focus();
}
function changeCountryCode(){
	$('.select_country_code').text($('#country_code_select').val());
	mobileflag();
}
function fediconsChecking(){
	if(isShowFedOptions === 0 || $(".profile_head").is(":visible")){
    	$(".fed_2show,.line").hide();
    	return false;
    }else if(typeof signinathmode != "undefined" && signinathmode != "lookup"){ // no i18n
    	return false;
    }
	if(!isneedforGverify || (isLargeFedIcons && (/Mac|iPad|iPhone|iPod/.test(navigator.platform || "")))){
	    $("#appleNormalIcon").remove();
	    $("#macappleicon").show();
    }else if($("#macappleicon").length == 1){
	    $("#macappleicon").remove();
	    $("#appleNormalIcon").show();
    }
	if(isLargeFedIcons){
		$(".fed_div:not(.more)").addClass("large_box large_fed_box").removeClass("small_box");
		$(".fed_text").show();
		
	} else {
		$(".fed_div").removeClass("large_box").addClass("small_box");
		$(".fed_text").hide();
		isneedforGverify ? $(".google_icon .fed_text").show(): $(".google_icon .fed_text").hide();
	}
	if(document.querySelectorAll('.fed_div:not(.more)').length > 0){
		$(".fed_2show").show();
		$(".fed_div").hide();
		var fedEle = document.getElementsByClassName('fed_div')[0]; 
		fedEle.style.display = "inline-block";
		fedEle.classList.add("show_fed"); // no i18n
	    var fed_all_width = $('.signin_box').width();
	    var show_fed_length =  Math.floor(fed_all_width / (fedEle.clientWidth + parseInt($(fedEle).css("margin-right")))); 
	    var moreiconcount = 1; 
	    if($('.fed_div').length - moreiconcount > show_fed_length){
			show_fed_length = (fed_all_width % (fedEle.clientWidth + parseInt($(fedEle).css("margin-right")))) < parseInt($(".more").css("width")) ? show_fed_length-1 : show_fed_length;	//No I18N
		    for(var i= 1; i < show_fed_length; i++){
			    document.getElementsByClassName('fed_div')[i].style.display = "inline-block";
			    document.getElementsByClassName('fed_div')[i].classList.add("show_fed"); // no i18n
		    }
			$(".more").removeClass("large_box").addClass("small_box").show();
	    }else{
	    	$('.more').remove();
	    	$(".fed_div:last").css("margin","0px");
		    $('.fed_div').show();
	    }
	} else {
		$('.fed_2show,.line').hide();
	}
}
function onSigninReady(){
	if(typeof signin_info_urls != undefined && signin_info_urls && Object.keys(signin_info_urls).length > 0){
		handleMultiDCData();
	}
	else{
		hideloader();
		fediconsChecking();
	}
	$(".multiDC_info").hover(
	    function() {
	      loadTooltipPosition();
	      $(".up-arrow").show();
	    },
	    function() {
	    	$(".up-arrow").hide();
	    }
	);
	$(".up-arrow").hover(
		    function() {
		      $(".up-arrow").show();
		      
		    },
		    function() {
		    	$(".up-arrow").hide();
		    }
		);
	clearInterval(_time);
	reload_page =setInterval(checkCookie, 5000); //No I18N
	isMobileonly = false;
	!isMobile && enableServiceBasedBanner ? loadRightBanner() : hiderightpanel();
	if(!isPreview){
		setCookie(24);
	    if(document.cookie.indexOf("IAM_TEST_COOKIE") != -1){ // cookie is Enabled
	        setCookie(0);
	        $('#enableCookie').hide();
	    } else { // cookie is disabled
	        $('.signin_container,#signuplink,.banner_newtoold').hide();
	        $('#enableCookie').show();
	        return false;
	    }
    }
	if(!isValid(loginID) && trySmartSignin && localStorage && localStorage.getItem("isZohoSmartSigninDone")){
		openSmartSignInPage();
		return false;
	}
	if(isCaptchaNeeded === "true"){
		changeHip();
		$("#captcha_container").show();
		$("#login_id").attr("tabindex", 1);
		$("#captcha").attr("tabindex", 2);
		$("#nextbtn").attr("tabindex", 3);
		$("#captcha").focus();
	}
	if(digest && isValid(digest)){
		$(".Notyou").hide();
		var loginurl = uriPrefix +"/signin/v2/lookup/"+euc(digest)+"?mode=digest";//no i18N
		sendRequestWithCallback(loginurl, signinParams ,true, handleLookupDetails);
	}
	if(!emailOnlySignin || !hideCCode){
		if(isValid(reqCountry)){
	      	reqCountry = "#"+reqCountry.toUpperCase();
	      	$('#country_code_select option:selected').removeAttr('selected');
	      	$("#country_code_select "+reqCountry).attr('selected', true);
	      	$("#country_code_select "+reqCountry).trigger('change');
	      }
		if(isValid(CC)){ $("#country_code_select").val($("#"+CC).val()) };
		$(".select_country_code").text($("#country_code_select").val());
		if(!isMobile || rendermovileUV){
			renderUV("#country_code_select", true, "#login_id", "left", "flagIcons", true, true, "country_implement", rendermovileUV ? true : false, "data-num", "value", "data-num");//no i18n
			if(!show_CC_onload){
				$(".select_container--country_implement").hide();
			}
			$(".country_code_select .selectbox").append($("<span>").addClass("closeCountryCode"));
		}else{
			mobileflag();
			$("<span class='closeCountryCode'></span>").insertBefore(".arrow_position");
			if(hideUVFlag){$(".country_code_close .mobileFlag").css('margin-inline-start', '0px')}
		}
		$('.closeCountryCode').click(function() {
			event.stopPropagation();
			hideCountryCode();
		});
		checking();
	      $("#select2-country_code_select-container").html($("#country_code_select").val());
	      $("#country_code_select").change(function(){
	        $(".country_code").html($("#country_code_select").val());
	        $("#select2-country_code_select-container").html($("#country_code_select").val());
	        $("#login_id").removeClass("textindent62");
	        $("#login_id").removeClass("textindent70");
	        $("#login_id").removeClass("textintent52");
	        $("#login_id").removeClass("textindent42");
	        checkTestIndent();
	        $(".select2-search__field").attr("placeholder", I18N.get("IAM.SEARCHING"));
	        if(isMobile && $(".select_country_code").is(":visible")){
	       	   $("#login_id").addClass(hideUVFlag ? "textindent70" : "textindent62");
	           return false;
	        }
	      });
	}
	set_refresh_option();
}
function changeSecDevice(elem){
	if($(elem).children("option:selected").val() == prevoption){
		return false
	}
	isOauPopupClosed = false;
	if(isMobile){mobile_view_Device();}
	prevoption = $(elem).children("option:selected").val();
	var version = $(elem).children("option:selected").attr('version');
	var device_index = $(elem).children("option:selected").val();
	version === "1.0" ? oadevicepos = device_index : mzadevicepos = device_index ;
	version === "1.0" ? enableOneauthDevice() : enableMyZohoDevice();
	hideTryanotherWay();
    if(version == "1.0"){$('.tryanother').hide();};
}
function checkTestIndent(){
	if($(".select_container--country_implement").is(":visible"))
	{
		//$(".select_container--country_implement ~ input").attr("style","text-indent:95px !important; display:inline-block;");//no i18n
		uvselect.setIntentForCntyCode("country_code_select"); //no i18N 
		return false;
	}
}
function loadRightBanner(){
	var action = "/signin/v2/banner"; // no i18n
	if (typeof contextpath !== 'undefined') {
		action = contextpath + action;
	}
	$.ajax({
		  url:  action,
		  data: signinParams,
		  success: function(resp){
			  handleRightBannerDetails(resp);
		  },
		  headers: { 
			  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', //no i18n
			  'X-ZCSRF-TOKEN': csrfParam+'='+euc(getCookie(csrfCookieName)) //no i18n
		  }
		});
}
function handleRightBannerDetails(resp){
	var rightboxHtml = $(".rightside_box").html();
	if(IsJsonString(resp)) {
		resp = JSON.parse(resp);
	}
	$('.overlapBanner').remove()
	if(resp.banner[0].template.length === 1){
		$(".rightside_box").html(rightboxHtml +"<div id='overlapBanner' class='overlapBanner' " + resp.banner[0].template+"</div>");
		if(!mfaBanner){
			$(".mfa_panel").hide();
			$('.overlapBanner').show();
		}
	}else if(resp.banner[0].template.length > 1){
		var dottedHtml = bannerHtml = "";
		var bannerDetails = resp.banner[0].template;
		var count;
		bannerDetails.forEach(function(data,index){
            if(index != 0){
               bannerHtml += "<div id='banner_"+index+"' class='rightbanner rightbannerTransition slideright' >"+data+"</div>"; 
            }else{
            	bannerHtml += "<div id='banner_"+index+"' class='rightbanner rightbannerTransition' >"+data+"</div>";
            }
			dottedHtml += "<div class='dot' id='dot_"+index+"'><div></div></div>";
			count = index +1;
		});
		$(".rightside_box").html(rightboxHtml + "<div id='overlapBanner' class='overlapBanner' style='width:300px'>"+bannerHtml+"</div><div class='dotHead'>"+dottedHtml+"</div>");
		$(".banner1_href").text(I18N.get('IAM.TFA.LEARN.MORE'));
		if(!mfaBanner){
			$(".mfa_panel").hide();
			$(".overlapBanner,.dotHead").show();
		}
        $("#dot_0").attr("selected",true);
        bannerCount = count;
        handleRightBannerAnimation(); 
	}else{
		hiderightpanel();
	}
}
function handleRightBannerAnimation(){
	bannerPosition = 0;
    bannerTimer = setInterval(function(){
        changeBanner(false);
        bannerPosition++;
        if(bannerPosition >= bannerCount){
            bannerPosition = 0;
        }
    },5000);
    $("#overlapBanner").on({
    	click: function() {
    		removeRightBannerAnimation();
        },
        mouseenter: function() {
        	holdRightBannerAnimation();
        },
        mouseleave: function() {
        	resumeRightBannerAnimation();
        }
    });
    $(".dot").on("click", function(){
    	callBannerFromDot(this.attributes.id.value.split("dot_")[1]);
    })
}

function removeRightBannerAnimation(){
	if(isBannerOnHold){
		resumeRightBannerAnimation();
	}
	clearInterval(bannerTimer);
	clearTimeout(resumeBannerIn);
	$("#overlapBanner").off("mouseenter").off("mouseleave").off("click");//no i18n
	$(".dot[selected=selected] div").css({"transition":"opacity 0s ease-in-out,transform 0.3s linear", "background":"#00a2f6"});
}

function holdRightBannerAnimation(){
	if(isBannerOnHold){
		return false;
	}
	clearInterval(bannerTimer);
	clearTimeout(resumeBannerIn);
	isBannerOnHold = true;
	var selectedDotDiv = $(".dot[selected=selected] div");
	selectedDotDiv.css("transform",selectedDotDiv.css("transform"));//no i18n
	var dotTransformation = selectedDotDiv.css("transform");//no i18n
	balanceBannerTime = Math.round(5 - (((dotTransformation.split("matrix(")[1]).split(",")[0])*5));
	selectedDotDiv.css({"transition":"opacity .3s ease-in-out,transform "+balanceBannerTime+"s linear", "background":"#4E5BBE"});//no i18n
}
function resumeRightBannerAnimation(){
	if(!isBannerOnHold || isBannerHardPaused){
		return false;
	}
	isBannerOnHold = false;
	$(".dot[selected=selected] div").css("transform","scaleX(1)");
	$(".dot div").css("background","#00a2f6");
	resumeBannerIn = setTimeout(function(){
		changeBannerAndSetInterval();
	},parseInt(balanceBannerTime*1000));
}
function changeBannerAndSetInterval(){
	changeBanner(false);
    bannerPosition++;
    if(bannerPosition >= bannerCount){
        bannerPosition = 0;
    }
	bannerTimer = setInterval(function(){
        changeBanner(false);
        bannerPosition++;
        if(bannerPosition >= bannerCount){
            bannerPosition = 0;
        }
    },5000);
}
function changeBanner(elem,isNoAnimation){
	$(".dot[selected=selected] div").css({"transition":"opacity .3s ease-in-out,transform 0s linear","transform":"scaleX(0)"});
	bannerPosition = bannerPosition != undefined ? bannerPosition : parseInt(elem.getAttribute('bannerposition'));
	$('.rightbanner').addClass('slideright');
	if(bannerPosition === bannerCount - 1){
    	$('#banner_0').removeClass('slideright');
    }
    else{    	
    	$('#banner_'+(bannerPosition+1)).removeClass('slideright');
    }
	$('#banner_'+bannerPosition).addClass('slideright');
    var dotPosition = bannerPosition === (bannerCount -1) ? 0 : bannerPosition + 1;
 	$(".dot").attr("selected",false);
	$("#dot_"+(dotPosition)).attr("selected",true); // no i18n
	var selectedDotDiv = $(".dot[selected=selected] div");
	if(isNoAnimation){
		selectedDotDiv.css("transition","opacity 0s ease-in-out,transform 0s linear"); // no i18n
	}else{
		selectedDotDiv.css("transition","opacity .3s ease-in-out,transform 5s linear"); // no i18n
	}
	selectedDotDiv.css("transform","scaleX(1)"); // no i18n
}
function callBannerFromDot(position){
	removeRightBannerAnimation();
	isBannerOnHold=false;
	bannerPosition = position == 0 ? bannerCount-1 : position - 1;
	clearInterval(bannerTimer);
	clearTimeout(resumeBannerIn);
	changeBanner(false,true);
}
function hiderightpanel(){
	$(".signin_container").css("maxWidth","500px");
	$(".rightside_box").hide();
	$("#recoverybtn, #problemsignin, .tryanother,.contactSupport").css("right","0px");
}
function format (option) {
	var spltext;
      if (!option.id) { return option.text; }
         spltext=option.text.split("(");
         var cncode = $(option.element).attr("data-num");//no i18N 
		 var cnnumber = $(option.element).attr("value");//no i18N
		 var cnnum = cnnumber.substring(1);
		 var flagcls="flag_"+cnnum+"_"+cncode;//no i18N
      var ob = '<div class="pic '+flagcls+'" ></div><span class="cn">'+spltext[0]+"</span><span class='cc'>"+cnnumber+"</span>" ;
      return ob;
 };
function handleRequestCountryCode(resp){
	if(IsJsonString(resp)){resp=JSON.parse(resp) }
	if(resp.isd_code){
		reqCountry = resp.country_code;
		reqCountry = "#"+reqCountry.toUpperCase();
      	$('#country_code_select option:selected').removeAttr('selected');
      	$("#country_code_select "+reqCountry).attr('selected', true);
      	$("#country_code_select "+reqCountry).trigger('change');
      	$("#login_id").removeClass("textindent62");
      	$("#login_id").removeClass("textindent70");
        $("#login_id").removeClass("textintent52");
        $("#login_id").removeClass("textindent42");
	}
}
function checking(){
	if(hideCCode){
		return false;
	}
	var elem = "login_id"; //no i18N
	if($("#"+elem).hasClass("mobilefield")){
		allownumonly(de(elem));
	}
	var a=$("#"+elem).val().trim();
	var check=/^(?:[0-9] ?){0,1000}[0-9]$/.test(a);
	var isDomainList = Boolean(typeof isValidOrg !== 'undefined' && typeof orgDomainList !== 'undefined' && isValidOrg && orgDomainList);//no i18N
	$(".select2-selection--single").attr("tabindex","-1");//no i18N
	if(!isCountrySelected){
		var reqUrl = uriPrefix +"/accounts/public/api/locate?"+signinParams; // no i18n
		sendRequestWithCallback(reqUrl,"",true,handleRequestCountryCode); // no i18n
		isCountrySelected = true;
	}
	if((check==true)&&(a)&&!hiddenCountrycode){
		try{
			$(".select_container--country_implement").show();
			checkTestIndent();
			$(".selection").addClass("showcountry_code");
			if(isMobile && !rendermovileUV){
				$(".MobflagContainer").show();
		  		$('.select_country_code,#country_code_select').show();
		  		$("#login_id").addClass(hideUVFlag ? "textindent70" : "textindent62");
		  	} 
			else{
				$('.select2').show();
			}
			$(".showCountryCode").slideUp(200);
			isDomainList && handleDomainChange(true);
		}catch(err){
			$('.select_country_code,#country_code_select').css("display","block");
			$("#login_id").addClass(hideUVFlag ? "textindent70" : "textindent62");
		}
	}
	else if(check==false && !show_CC_onload){
		isDomainList && enableDomain();
		$(".MobflagContainer").hide();
        $("#login_id").removeClass("textindent62");
        $("#login_id").removeClass("textindent70");
		$('.select_country_code,#country_code_select,.select2').hide();
		removeUVindent();
		$(".select_container--country_implement").hide();
		if(hiddenCountrycode){
			$(".showCountryCode").slideUp(100);
			numericEditCounts = 0;
		}
	}
	hiddenCountrycode && (check ? (a && numericEditCounts++, numericEditCounts >= 3 && $(".showCountryCode").slideDown(200)) : $(".showCountryCode").slideUp(100));
	if(!isMobile && !$(".domainselect").is(":visible")){
		$("#portaldomain .select2").css("display","block");
	}
}

function removeUVindent(){
	$(".select_container--country_implement ~ input").removeClass("uvtextindent0 uvtextindent2 uvtextindent3 uvtextindent4");
	if($(".select_container--country_implement").is(":visible")){
		$(".select_container--country_implement ~ input").attr("style","text-indent:10px")//no i18n
	}
}
function IsJsonString(str) {
	try {
		$.parseJSON(str);
	} catch (e) {
		return false;
	}
	return true;
}
function getCookie(cookieName) {
	var nameEQ = cookieName + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i].trim();
		if (c.indexOf(nameEQ) == 0){ 
			return c.substring(nameEQ.length,c.length)
		};
	}
	return null;
}
function clearCommonError(field){
	var container=field+"_container";//no i18N
	$("#"+field).removeClass("errorborder");
	$("#"+container+ " .fielderror").slideUp(100);
	$("#"+container+ " .fielderror").removeClass("errorlabel");
	$("#"+container+ " .fielderror").text("");
}
function clearFieldValue(fieldvalue){
	$('#'+fieldvalue).val("");
}
function resetForm(isfromIP) {
	PriotpThreshold = 3;
	if(isfromIP && enableServiceBasedBanner)
	{
		$(".signin_container").css("maxWidth","");
		$(".rightside_box").show();
		$("#recoverybtn, #problemsignin, .tryanother,.contactSupport").css("right","");
	}
	if ($('#regionSelect_container').is(':visible')) {
	    $('#regionSelect_container').hide();
	    $('#signin_div').show();
	}
	signinParams = getSigninParms();
	selectedRegionalDC = undefined;
	$("#nextbtn,#otp").css("pointer-events","auto");
	$("#signuplink").show();
	$("#resendotp, #blueforgotpassword").removeAttr("style");
	$("#login_id_container").slideDown(200);
	$("#captcha_container,.textbox_actions,#mfa_device_container,#backupcode_container,#recoverybtn,#waitbtn,.textbox_actions_more,#openoneauth,.textbox_actions_saml,#problemsignin,.nopassword_container,.externaluser_container,.resetIP_container,#continuebtn, #qrOneContent, #qrOrLine,#mfa_totp_container,#contactSupport, #mfa_otp_container, #mfa_email_container, #mfa_totp_container, #mfa_scanqr_container,.username_info_container").hide();
	$(".signin_box").css("height", "");
	$("#password_container").addClass("zeroheight");
	$("#password_container,#otp_container").slideUp(200);
	$("#forgotpassword,#nextbtn,#password_container .textbox_div,#login_id").show();
	$("#smartsigninbtn").removeClass("hide");
	$(".fed_div_text span").text("");
	$(".facebook_fed").removeClass("fed_div_text");
	$(".signin_fed_text").show();
	$("#login, .signin_head, #headtitle, .service_name, .fieldcontainer, .fieldcontainer .hellouser").show();
	$("#goto_resetIP, #alternate_verification_info").hide();
	$("#nextbtn span").text(I18N.get("IAM.NEXT"));
	$(".backbtn,.open_redirection_container").hide();
	$(".fielderror").removeClass("errorlabel");
	$("input").removeClass("errorborder");
	$(".fielderror").text("");
	$(".nopassword_container").removeAttr("style");
	var userId = $("#login_id").val().trim();
	$("#fed_signin_options, #problemsigninui, #AMFAemail_container").html('');
	$("#problemsignin_container, #domain_btn, #AMFAownership_container").hide();
	$(".select2-selection__arrow").removeClass("hide");
	$('.showmoresigininoption').off('click');
	$(".showmoresigininoption").on("click",function(){
		showmoresigininoption();
	});
	$(".showmoresigininoption").text(I18N.get("IAM.NEW.SIGNIN.TRY.ANOTHERWAY"));
	changeButtonAction(I18N.get('IAM.NEXT'),false);//no i18n
	if(!emailOnlySignin || !hideCCode){
		if(userId.indexOf("-") != -1){
			var phoneId = userId.split("-");
			if(isPhoneNumber(phoneId[1])){
				$("#login_id").val(phoneId[1]);
				$("#select2-country_code_select-container").html("+"+phoneId[0]);
				$( "#country_code_select").val("+"+phoneId[0])
				checking();
			}
		}
	}
	$(".zoho_logo").removeClass('applycenter');
	$('#headtitle').html(I18N.get("IAM.SIGN_IN"));
	$('.service_name').removeClass('extramargin');
	$("#login_id_container .textbox_div").show();
	$('.service_name').html(formatMessage(I18N.get("IAM.NEW.SIGNIN.SERVICE.NAME.TITLE"),displayname));
	if(!isMobile){$(".line").show();}
	$(".fed_2show,#signuplink,#showIDPs,.banner_newtoold,.show_fed").show();
	if(de('forgotpassword')) {
		$("#forgotpassword").removeClass("nomargin");
	}
	if(de("password")){de("password").value=""}
	$("#login_id").focus();
	isFormSubmited = isPasswordless = isShowEnableMore = isLdapVisible = isOauPopupClosed = isArattaiSmsCodeSent = false;
	emailposition = mobposition = undefined;
	$(".blueforgotpassword, .resendotp").addClass("bluetext_action_right");
	$("#forgotpassword").removeClass("bluetext_action_right");
	signinathmode = "lookup";//No i18N
	callmode="primary"; // No i18n
	$("#login_id_container .textbox_div").show();
	if($(".fed_div").length < 1 ){
		$(".fed_2show").hide();
	}else{
		fediconsChecking();
	}
	if(isClientPortal){
		return false;
	}
	de("otp").value=""; //No I18N
	if(!emailOnlySignin && !hideCCode){
		if(isMobile && userId &&isPhoneNumber(userId.split('-')[1])){
			$("#country_code_select").val("+"+userId.split('-')[0]).change();
		}else if(userId && isPhoneNumber(userId.split('-')[1])){
			$("#country_code_select").uvselect("destroy");
			$( "#country_code_select" ).val('+'+userId.split('-')[0]);
			renderUV("#country_code_select", true, "#login_id", "left", "flagIcons", true, true, "country_implement", undefined, "data-num", "value", "data-num");//no i18n
		}
	}
	$(".signin-mode").removeClass("signin-mode");
}
function switchto(url){
	clearTimeout(reload_page);
	if(url.indexOf("http") != 0) { //Done for startsWith(Not supported in IE) Check
		var serverName = window.location.origin;
		if (!window.location.origin) {
			serverName = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
		}
		if(url.indexOf("/") != 0) {
			url = "/" + url;
		}
		url = serverName + url;
	}
	if(isClientPortal && load_iframe){
		window.location.href = url; 
		return false;
	}
	window.top.location.href=url;
}
function showAndGenerateOtp(enablemode,captchavalue){
	prev_showmode = enablemode = enablemode != undefined ? enablemode : allowedmodes.indexOf("email") != -1 ? "email" : "otp"; // no i18n
	if(typeof enablemode !== "undefined"){
		emobile = enablemode === 'email' ? deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].e_email : deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].e_mobile;
		rmobile = enablemode === 'email' ? deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].email : identifyEmailOrNum(deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].r_mobile,true);
	}
	if(isPasswordless){
		$(".service_name").html(formatMessage(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.OTP"),rmobile));
	}
	if(isEmailVerifyReqiured && enablemode == "email"){
		checkEmailOTPInitiate();
		return false;
	}
	generateOTP(false,enablemode,captchavalue);
	return false;
}
function showOtpDetails(){
	$("#password_container,#mfa_totp_container").hide();
	var loginId = deviceauthdetails && deviceauthdetails.lookup.loginid?deviceauthdetails.lookup.loginid:de("login_id").value;//no i18n
	$('.textbox_actions').show();
	showSigninUsingFedOption();
	if(isShowEnableMore){
		isShowEnableMore = false;
		$('#enablemore').show();
		$('.textbox_actions').hide();
		$('.textbox_actions,.blueforgotpassword').hide();
		goBackToCurrentMode(true);
	}
	if(isPasswordless && oaNotInstalled){
		$(".service_name").html(formatMessage(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.OTP"),rmobile));
	}
	$("#otp").val("");
	$('#otp_container .username').text(identifyEmailOrNum());
	if(!isClientPortal){enableSplitField("otp",otp_length,I18N.get("IAM.VERIFY.CODE"))}
	$("#otp_container").show();
	$("#captcha_container,#enableforgot").hide();
	if(isClientPortal){$("#otp").focus();}else{$("#otp").click()}
	changeButtonAction(I18N.get('IAM.NEW.SIGNIN.VERIFY'),false);//no i18n
	if(isPasswordless){
		$('#signinwithpass,#enableoptionsoneauth').hide();
		$('.signin_head').css('margin-bottom','10px');
		$("#nextbtn span").text(I18N.get('IAM.SIGN_IN'));
		$('.username').text(identifyEmailOrNum());
		resendotp_checking(); 
		if (!isRecovery) {allowedModeChecking();}
		$('#problemsignin,#recoverybtn,.tryanother').hide();
		$("#enablemore #resendotp").show();
		$("#enablemore #blueforgotpassword").hide();
		if(secondarymodes.length > 1){
			$(".otp_actions").hide();
		}
		if(isPasswordless){
			var showingmodes = secondarymodes;
			if(showingmodes.length == 3){
				if(showingmodes.indexOf("password") != -1){
					$("#signinwithpass").show();
				}else{
					$("#signinwithpass").hide();
				}
				if(showingmodes.indexOf("ldap") != -1){
					$("#signinwithldappass").show();
				}else{
					$("#signinwithldappass").hide();
				}
				 $(".otp_actions").show();
				 $("#enablemore").hide();
			}else{
				$("#enableoptionsoneauth").hide();
				allowedmodes.indexOf("totp") != -1 && prev_showmode != "totp" ? $("#signinwithtotponeauth").css("display","block") : $("#signinwithtotponeauth").hide(); // no i18n
				allowedmodes.indexOf("password") != -1 ? $("#signinwithpassoneauth").css("display","block") : $("#signinwithpassoneauth").hide();
				allowedmodes.indexOf("otp") != -1 ? $("#signinwithotponeauth").css("display","block") : $("#signinwithotponeauth").hide();
				allowedmodes.indexOf("email") != -1 ? $("#passlessemailverify").css("display","block") : $("#passlessemailverify").hide();
				allowedmodes.indexOf("ldap") != -1 ? $("#signinwithldaponeauth").css("display","block") : $("#signinwithldaponeauth").hide();
				allowedmodes.indexOf("otp") != -1 ? $("#signinwithotponeauth").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.PASSWORDLESS.OTP.VERIFY.TITLE"),identifyEmailOrNum(deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].r_mobile,true))) : "";
				allowedmodes.indexOf("email") != -1 ? $("#passlessemailverify").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.PASSWORDLESS.EMAIL.VERIFY.TITLE"),deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].email)) : "";
				if(prev_showmode == "otp"){
					 $("#signinwithotponeauth").hide()
				}
				if(prev_showmode == "email"){
					$("#passlessemailverify").hide();
				}
			}
			return false;
		}
	}
}
function showPassword(isLdapPassword){
	$("#password").val("");
	clearCommonError("password");//no i18n
	$("#password_container .textbox_div").show();
	$('#password_container').removeClass('zeroheight');
	$("#otp_container").slideUp(300);
	$("#password_container").slideDown(300);
	$("#mfa_totp_container").hide();
	changeButtonAction(I18N.get('IAM.SIGN_IN'),false);//no i18n
	$(".mobile_message").hide();
	$(".service_name").show();
	$("#captcha_container").hide();
	$("#password").focus();
	if(isLdapPassword){
		signinathmode="ldappasswordauth";//no i18N
		$('.blueforgotpassword').hide();
		prev_showmode = "ldap";// no i18n
		$("#password").attr("placeholder",I18N.get("IAM.LDAP.PASSWORD.PLACEHOLDER"));
		isLdapVisible = true;
		$("#enableldap").hide();
	}else{
		$("#signinwithldappass").show();
		signinathmode="passwordauth";//no i18N
		prev_showmode = "password";// no i18n
		$("#password").attr("placeholder",I18N.get("IAM.NEW.SIGNIN.PASSWORD"));
		isLdapVisible = false;
		$('#blueforgotpassword').show();
		$("#enablepass").hide();
	}
	
	var mode = isLdapPassword ? "ldap" : "password"; // no i18n
	if(!isPasswordless){
		fallBackForSingleMode(mode,validateAllowedMode(mode).option);
	}
	if(isPasswordless){
		if(oaNotInstalled){
			$(".service_name").html(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.PASSWORD"));
		}
		$("#enableotpoption,#enablesaml,#enablejwt,#enablemore .resendotp,#enableoptionsoneauth,#signinwithpassoneauth").hide();
		var showingmodes = secondarymodes;
		if(showingmodes.length == 3){
			if(isLdapPassword){
				showingmodes.indexOf("otp") != -1  || showingmodes.indexOf("email") != -1 ? $("#enableotpoption").show() : showingmodes.indexOf("password") != -1 ? $("#enablepass").show() : $("#enablepass").hide(); // no i18n
				showingmodes.indexOf("otp") != -1  || showingmodes.indexOf("email") != -1 ?  $("#enablepass").hide():"";
			}else {
				showingmodes.indexOf("otp") != -1  || showingmodes.indexOf("email") != -1 ? $("#enableotpoption").show() : showingmodes.indexOf("ldap") != -1 ? $("#enableldap").show() : ""; // no i18n
			}
		}else if(showingmodes.length > 3){
			$("#enablemore").show();
		}
	}else{
		if(isLdapPassword){
			if(btnAllowedModes() == 2){
				if(allowedmodes.indexOf("password") == -1){
					$("#enablepass").hide()
				}else{
					$("#enablepass").show();
					$("#enablemore").hide();
				}
				$("#signinwithldappass").hide();
			}
		}else if(btnAllowedModes() == 2){
				$("#enablepass").hide();
				if(allowedmodes.indexOf("ldap") == -1){
					$("#enableldap").hide();
				}else{
					$("#enableldap").show();
					$("#enablemore").hide();
				}
		}else if(btnAllowedModes() == 1 &&(allowedmodes.indexOf("password") != -1)){
			$('#enableforgot').show();
		}
	}
	showSigninUsingFedOption();
}
function showTryanotherWay(){
	showHideEnforcePop(false);
	clearInterval(_time);
	clearTimeout(oneauthgrant);
	clearCommonError("yubikey"); // no i18n
	$('.optionmod').show();
	if(isMobileonly && prev_showmode === "mzadevice"){
		$('.signin_container').addClass('mobile_signincontainer');
		$("#try"+prefoption).hide();
		$('.blur').show();
		$('.blur').addClass('dark_blur');
		allowedModeChecking_mob();
		return false;
	}
	$('.signin_head').css('margin-bottom','10px');
	$(".addaptivetfalist,.borderlesstry,#trytitle").show(); // no i18n
	$("#nextbtn,.service_name,.fieldcontainer,#headtitle,#problemsignin,#recoverybtn_mob,#problemsignin_mob,.verify_title,.tryanother,#totpverifybtn .loadwithbtn").hide();
	$("#trytitle").html("<span class='icon-backarrow backoption trytitlebackop'></span>"+I18N.get('IAM.NEW.SIGNIN.TRY.ANOTHERWAY.HEADER')+"");//no i18n
	var preferoption = deviceauthdetails[deviceauthdetails.resource_name].modes.mzadevice.data[mzadevicepos].prefer_option;
	$("#verify_totp_container, #verify_qr_container").hide();
	if(preferoption === "totp") { $('#trytotp').hide();}
	if(preferoption === "scanqr") { $('#tryscanqr').hide();}
	preferoption === "totp" ? tryAnotherway('qr') : tryAnotherway('totp'); //no i18n
	if (!isRecovery) {allowedModeChecking();}
	isTroubleSignin =  true;
	$(".trytitlebackop").on("click", function(){
		hideTryanotherWay();
	});
	return false;
}
function allowedModeChecking_mob(){
	$('.addaptivetfalist').addClass('heightChange')
	$("#recoverybtn,#recoverybtn_mob,#recoverybtn_mob,#recoverybtn").hide();
	allowedmodes.indexOf("recoverycode")!=-1 ? $('#recoverOption').show() : $('#recoverOption').hide();
	isSecondary = deviceauthdetails[deviceauthdetails.resource_name].modes.otp && deviceauthdetails[deviceauthdetails.resource_name].modes.otp.count > 1 ? true : isSecondary;
	!isSecondary ? $('#recoverybtn_mob').show() : $('#problemsignin_mob').show();
	!isSecondary ? $('#problemsignin_mob').hide(): $('#recoverybtn_mob').hide();
	return false;
}
function showmzadevicemodes(){
	$('.devices').css('display','');
	showTryanotherWay();
	$('#problemsigninui,#recoverybtn, #problemsignin_container').hide();
	if (!isRecovery) {allowedModeChecking();}
}
function showproblemsignin(isBackup,optionUI,neednoremove){
	isTroubleSignin = false;
	var emailAdded, otpAdded = false;
	clearTimeout(oneauthgrant);
	showHideEnforcePop(false);
	$('#login,.backuphead').show();
	isValid($(".username").text())? $("#problemsignin_container .hellouser").show() : $("#problemsignin_container .hellouser").hide();
	hideOABackupRedirection();
	$('.devices,.devicedetails,#alternate_verification_info,#recovery_container').hide();
	clearInterval(_time);
	$('.signin_container').removeClass('mobile_signincontainer');
	window.setTimeout(function(){
		$(".blur").hide();
		$('.blur').removeClass('dark_blur');
	},100);
	isMobileonly ? $(".addaptivetfalist").removeClass("heightChange") : $(".addaptivetfalist").hide();
	$('#trytitle').html('');
	var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
	var currentmode = (prev_showmode === "mzadevice" && !isMobileonly && !isAMFA) ? "showmzadevicemodes()" : "goBackToCurrentMode()"; //no i18n
	if(!neednoremove){
		secondarymodes.splice(secondarymodes.indexOf(prev_showmode), 1);
		secondarymodes.unshift(prev_showmode);
	}
	var i18n_content = {"totp":["IAM.NEW.SIGNIN.VERIFY.VIA.AUTHENTICATOR","IAM.NEW.SIGNIN.VERIFY.VIA.AUTHENTICATOR.DESC"],"otp": ["IAM.NEW.SIGNIN.SMS.MODE","IAM.NEW.SIGNIN.OTP.HEADER"],"yubikey":["IAM.NEW.SIGNIN.VERIFY.VIA.YUBIKEY","IAM.NEW.SIGNIN.VERIFY.VIA.YUBIKEY.DESC"], "password":["IAM.PASSWORD.VERIFICATION","IAM.NEW.SIGNIN.MFA.PASSWORD.DESC"],"saml":["IAM.NEW.SIGNIN.SAML.TITLE","IAM.NEW.SIGNIN.SAML.HEADER"],"jwt":["IAM.NEW.SIGNIN.JWT.TITLE","IAM.NEW.SIGNIN.SAML.HEADER"],"email": ["IAM.NEW.SIGNIN.EMAIL.TITLE","IAM.NEW.SIGNIN.OTP.HEADER"]}; //No I18N
	var i18n_recover = {"otp" : ["IAM.AC.CHOOSE.OTHER_MODES.MOBILE.HEADING", "IAM.NEW.SIGNIN.OTP.HEADER"], "email" : ["IAM.AC.CHOOSE.OTHER_MODES.EMAIL.HEADING", "IAM.NEW.SIGNIN.OTP.HEADER"], "domain":["IAM.AC.CHOOSE.OTHER_MODES.DOMAIN.HEADING", "IAM.AC.CHOOSE.OTHER_MODES.DOMAIN.DESCRIPTION"]}; // no i18n
	var jsonPackage = deviceauthdetails[deviceauthdetails.resource_name];
	var headingcontent = jsonPackage.isAMFA ?  allowedmodes.length > 1 && optionUI? "IAM.AMFA.PROBLEM.SIGNIN.HEADING" : "IAM.SIGNIN.AMFA.VERIFICATION.HEADER" : "IAM.NEW.SIGNIN.PROBLEM.SIGNIN"; // no i18n
	var problemsigninheader = "<div class='problemsignin_head'><span class='icon-backarrow backoption backproblemsigninelem'></span><span class='rec_head_text'>"+I18N.get(headingcontent)+"</span></div>";
	var allowedmodes_con = "";
	var noofmodes = 0;
	if((prev_showmode == "mzadevice" || neednoremove) && !jsonPackage.isAMFA){
		var problemsigninheader = "<div class='problemsignin_head'><div class='oa_head_text'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY')+"</div><div class='oa_head_con'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY.DESC')+"</div></div>";
		
	}
	if(jsonPackage.isAMFA){
		problemsigninheader = problemsigninheader+"<div class='oa_head_con margin12'>"+I18N.get('IAM.AMFA.PROBLEM.SIGNIN.DESC')+"</div>";
	}
	var i18n_msg = jsonPackage.isAMFA ?  i18n_recover : i18n_content;
	
	if(!isPasswordless){
		$('.problemsignincon').html("");
	}
	secondarymodes.forEach(function(prob_mode,position){
		var listofmob = jsonPackage.modes.otp && jsonPackage.modes.otp.data;
		if(isValid(listofmob) && listofmob.length > 1 && position === 0 && prob_mode === "otp" && !optionUI){
			otpAdded = true;
			listofmob.forEach(function(data, index){
				if(index != mobposition || neednoremove){
					var tempRmobile = identifyEmailOrNum(data.r_mobile,true);
					var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
					var secondary_desc = formatMessage(I18N.get(i18n_msg[prob_mode][1]),tempRmobile);
					allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc,index);
					noofmodes++;
				}
			});
		}
		var listofemail = jsonPackage.modes.email && jsonPackage.modes.email.data;
		listofdomain = jsonPackage.modes.domain && jsonPackage.modes.domain.data;
		if(isValid(listofemail) && listofemail.length > 1 && position === 0 && prob_mode === "email" && !optionUI){
			emailAdded = true;
			listofemail.forEach(function(data, index){
				if(index != emailposition || neednoremove){
					var tempRmobile = data.email;
					var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
					var secondary_desc = formatMessage(I18N.get(i18n_msg[prob_mode][1]),tempRmobile);
					allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc,index);
					noofmodes++;
				}
			});
		}
		if(position != 0 || isBackup || optionUI){
			if(prob_mode != "recoverycode" && prob_mode != "passphrase"){
				if(prob_mode === "oadevice"){
					var oadevice_modes = jsonPackage.modes.oadevice.data;
					oadevice_modes.forEach(function(data,index){
						var oadevice_option = data.prefer_option;
						var device_name = data.device_name;
						var oneauthmode = oadevice_option ==="ONEAUTH_PUSH_NOTIF" ? "push" : oadevice_option === "ONEAUTH_TOTP" ? "totp" : oadevice_option === "ONEAUTH_SCAN_QR" ? "scanqr" : oadevice_option === "ONEAUTH_FACE_ID" ? "faceid": oadevice_option === "ONEAUTH_TOUCH_ID" ? "touchid" : "";//no i18N
						var secondary_header = I18N.get("IAM.NEW.SIGNIN.VERIFY.VIA.ONEAUTH");
						var secondary_desc = formatMessage(I18N.get("IAM.NEW.SIGNIN.VERIFY.VIA.ONEAUTH.DESC"),oneauthmode,device_name);
						allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc,index);
						noofmodes++;
					});
				}else if(prob_mode==="mzadevice"){ // no I18N
					var mzadevice_modes = jsonPackage.modes.mzadevice.data;
					mzadevice_modes.forEach(function(data,index){
						if(index != mzadevicepos && data.is_active){
							var mzadevice_option = data.prefer_option;
							var device_name = data.device_name;
							var secondary_header = deviceauthdetails[deviceauthdetails.resource_name].isAMFA ? I18N.get("IAM.AC.CHOOSE.OTHER_MODES.DEVICE.HEADING") : I18N.get("IAM.NEW.SIGNIN.VERIFY.VIA.ONEAUTH");
							var secondary_desc = formatMessage(I18N.get("IAM.NEW.SIGNIN.VERIFY.VIA.ONEAUTH.DESC"),mzadevice_option,device_name);
							allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc,index);
							noofmodes++;
						}
					});
				}else if(prob_mode==="otp"){//no i18n
					if(!otpAdded){
						listofmob.forEach(function(data,index){
							if(index != mobposition || neednoremove){
								var tempRmobile = identifyEmailOrNum(data.r_mobile,true);
								var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
								var secondary_desc = formatMessage(I18N.get(i18n_msg[prob_mode][1]),tempRmobile);
								allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc,index);
								noofmodes++;
							}
						});
					}
				}else if(prob_mode==="email"){//no i18n
					if(!emailAdded){
					listofemail.forEach(function(data,index){
						if(index != emailposition || neednoremove){
							var tempRmobile = data.email;
							var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
							var secondary_desc = formatMessage(I18N.get(i18n_msg[prob_mode][1]),tempRmobile);
							allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc,index);
							noofmodes++;
						}
					});
					}
				}
				else if(prob_mode === "domain"){
					var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
					var secondary_desc = I18N.get(i18n_msg[prob_mode][1]); 
					allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc);
					noofmodes++;
				}
				else if(prob_mode==="yubikey"){
					var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
					var secondary_desc = I18N.get(i18n_msg[prob_mode][1]);
					allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc);
					noofmodes++;
				}
				else{
					if(prob_mode != "federated" && prob_mode != "saml" && prob_mode != "oidc" && prob_mode != "jwt"){
						if(i18n_msg[prob_mode]){
							var jwtDesc;
							var secondary_header = I18N.get(i18n_msg[prob_mode][0]);
							var secondary_desc = I18N.get(i18n_msg[prob_mode][1]);
							allowedmodes_con += problemsigninmodes(prob_mode,secondary_header,secondary_desc);
							noofmodes++;
						}
					}
				}
			}
			else if(prob_mode === "recoverycode"){
				$('#recoverOption').show();
			}
		} 
	});
	if(noofmodes <= 0){
		showCantAccessDevice();
		return false;
	}
	$('#problemsigninui').html(problemsigninheader +"<div class='problemsignincon'>"+ allowedmodes_con+"</div>");
	if($(".tryanother").is(":visible")){
		$('.tryanother').hide();
	}
	if(noofmodes > 3 && !isMobile && !isBackup){
		$('.problemsignincon').addClass('problemsignincontainer');
	}
	$('.optionstry').addClass('optionmod')
	isPasswordless ? $('.contactSupport').show() : $('#recoverybtn').show();
	if(allowedmodes.indexOf('passphrase') == -1 && allowedmodes.indexOf('recoverycode') == -1){
		$('.contactSupport').show();
		$('#recoverybtn').hide();
	}
	var problemmode = allowedmodes[0];//no i18N
	$('#problemsignin,#headtitle,.service_name,.fieldcontainer,#nextbtn').hide();
	$('#problemsigninui, #problemsignin_container').show();
	$('.backproblemsigninelem').on('click', function() {
		prev_showmode === "mzadevice" && !isMobileonly && !isAMFA ? showmzadevicemodes() : goBackToCurrentMode(); //no i18n
	});
	$('.showCurrentMode').on('click', function() {
		if(this.id === "secondary_domain"){
			showAlterVerificationDomainInfo("domain");//no i18n
			return false;
		}
		isPasswordless && $(this).attr("mode") != "mzadevice" ? showAlterVerificationINfo($(this).attr("mode")) : showCurrentMode($(this).attr("mode"),parseInt($(this).attr("index"))); // No I18N
	});
	
}

function problemsigninmodes(prob_mode,secondary_header,secondary_desc,index){
	var clickEvent = isPasswordless && prob_mode != "mzadevice" ? "showAlterVerificationINfo('"+prob_mode+"')" :  "showCurrentMode('"+prob_mode+"',"+index+")"; // No I18N
	return  "<div class='optionstry options_hover showCurrentMode' id='secondary_"+prob_mode+"' mode="+prob_mode+" index="+index+">\
			<div class='img_option_try img_option icon-"+prob_mode+"'></div>\
			<div class='option_details_try'>\
				<div class='option_title_try'>"+secondary_header+"</div>\
				<div class='option_description'>"+secondary_desc+"</div>\
			</div>\
			</div>"	
}
function showAlterVerificationDomainInfo(prob_mode){
	prob_mode = prob_mode == undefined ? prev_showmode : prob_mode;
	$("#alternate_verification_info #headin_content").text(I18N.get("IAM.AC.SELECT.DOMAIN.MODE.HEADING"));
	$("#alternate_verification_info #headin_content").addClass("font20");
	$("#oaalter_title_sec, #oaalter_title_first").hide();
	$(".alterstep, .alterstep_con").show();
	$("#alterverify_head .backoption").off();
	$(".alterverify_head .backoption").on("click", function(){
		showproblemsignin(true,true,true);
		$(".problemsignin_head .backoption").hide();
	});
	$("#alterverify_desc").removeClass("margin12");
	$("#alterverify_desc").html(I18N.get("IAM.SIGNIN.DOMAIN.ALTER.VERIFICATION.DECS"));
	$(".oaalter_con_first").html(I18N.get("IAM.AC.DOMAIN.MODE.STEP1"));
	$(".oaalter_con_sec").text(I18N.get("IAM.AC.DOMAIN.MODE.STEP2"));
	$(".oaalter_con_first, .oaalter_con_sec, .oaalter_con_third, .oaalter_con_fourth").addClass("domain_alterinfo");
	$(".proceed_btn").text(I18N.get("IAM.CONTINUE"));
	$(".domain_step").show();
	$(".alterstep").html("");
	$(".alterstep").append('</div><div class="step1">1</div><div class="stepvertical"></div><div class="step2">2</div><div class="stepvertical"></div><div class="step3">3</div><div class="stepvertical"></div><div class="step4">4</div>');
	$(".fieldcontainer, #login .signin_head").hide();
	$('.devices,.devicedetails,#signin_box_info').hide();
	$("#login_id,#mfa_totp_container,#mfa_otp_container,#mfa_email_container,#waitbtn,#nextbtn,#mfa_scanqr_container,#mfa_push_container,#openoneauth,#yubikey_container").hide();
	clearInterval(_time);
	$("#contactSupport,#problemsigninui,#recoverybtn,#problemsignin_container").hide();
	$("#alternate_verification_info").show();
	$(".contactSupport").show();
	$("#contactSupport").hide();
	$(".AMFAdomain_container").hide();
	$(".stepvertical").css("height", ($(".alterstep_con div").height() - $('.step1').height()) - 2 +"px"); // no i18n
	prev_showmode = prob_mode;
	$(".proceed_btn").show();
	$(".proceed_btn").off().on("click", function(){
		showDomainlist();
	});
	oaNotInstalled = true;
	$("#alternate_verification_info .hellouser").show();
	return false;
}
function showDomainlist(){
	$(".alterstep, .alterstep_con").hide();
	$("#headin_content").text(I18N.get("IAM.AC.CHOOSE.DOMAIN"));
	$("#alterverify_desc").addClass("margin12");
	$("#alterverify_desc").html(formatMessage(I18N.get("IAM.AC.CHOOSE.DOMAIN.DESCRIPTION"),listofdomain.length.toString()));
	$(".alterverify_head .backoption").off();
	$(".alterverify_head .backoption").on("click", function(){
		showproblemsignin(true,true,true);
		$(".problemsignin_head .backoption").hide();
	});
	var domain_content="";
	listofdomain.forEach(function(domain, index){
		domain_content += "<div class='verify_domains' data-position="+index+"><div class='icon-domain domain_icon'></div><div class='domain_name'>"+domain.r_domain+"</div></div>";
	});
	$(".AMFAdomain_container").show();
	$(".AMFAdomain_container").html(domain_content);
	$(".AMFAownership").hide();
	$(".proceed_btn, .contactSupport, #domain_btn").hide();
	$(".verify_domains").off();
	$(".verify_domains").on("click", function(){
		domainverifcation(this.attributes["data-position"].value);
	});
}
function domainverifcation(dataposition){
	signinathmode=deviceauthdetails.resource_name;// NoI18n
	var r_domain = deviceauthdetails[signinathmode].modes.domain.data[dataposition? dataposition : $("#AMFAdomain").attr("dataposition")].r_domain;
	temptoken = deviceauthdetails[signinathmode].token;
	$(".alterverify_head .backoption").off();
	$(".alterverify_head .backoption").on("click", function(){
		showDomainlist();
	});
	$("#domain_btn").text(I18N.get("IAM.NEXT"));
	$("#headin_content").text(I18N.get("IAM.AMFA.SIGNIN.FULL.DOMAIN"));
	$("#alterverify_desc").html(formatMessage(I18N.get("IAM.SIGNIN.FULL.DOMAIN.DECS"),r_domain));
	$(".AMFAdomain_container").html("");
	$(".AMFAdomain_container").append("<input class='fulldomain textbox' id='AMFAdomain' dataposition = "+dataposition+" placeholder='"+I18N.get("IAM.AC.ENTER.DOMAIN")+"'><div class='fielderror'></div>");
	$("#domain_btn").show();
	$("#full_domain").focus();
	domainverification = true
}
function AMFAemailverification(data){
	$(".AMFAownership").hide();
	$("#alterverify_desc").html(formatMessage(I18N.get("IAM.SIGNIN.AMFA.EMAIL.DESC"),AMFA_rdomain_resp, data.attributes.dataoption.value));
	$("#domain_btn").text(I18N.get("IAM.AMFA.SEND.INSTRUCTIONS"));
	$("#headin_content").text(I18N.get("IAM.AC.ENTER.DOMAIN.CONTACT_ID.HEADING"));
	$(".AMFAemail_container").html("");
	$(".AMFAemail_container").append("<input class='domainemail textbox' id='AMFAemail' placeholder='"+I18N.get("IAM.ENTER.EMAIL")+"' type='"+data.attributes.type.value+"'><div class='fielderror'></div>");
	$("#domain_btn, .AMFAemail_container").show();
	$(".alterverify_head .backoption").off();
	$(".alterverify_head .backoption").on("click", function(){
		show_Domainownership();
	});
	domainverification = false; 
}
function show_Domainownership(){
	$("#AMFAownership_container, .AMFAemail_container").show();
	$("#domain_btn, .AMFAemail_container").hide();
	$("#headin_content").text(I18N.get("IAM.AC.ENTER.DOMAIN"));
	$("#alterverify_desc").html(formatMessage(I18N.get("IAM.SIGNIN.FULL.DOMAIN.DECS"),AMFA_rdomain_resp));
	$(".alterverify_head .backoption").off();
	$(".alterverify_head .backoption").on("click", function(){
		showDomainlist();
	});
	//AMFA_edomain_resp = AMFA_rdomain_resp = undefined;
}
function verifyDomain(frm){
	var e_domain = isValid(AMFA_edomain_resp) ? AMFA_edomain_resp : deviceauthdetails[signinathmode].modes.domain.data[$("#AMFAdomain").attr("dataposition")].e_domain;
	
	if(domainverification){
		var domain_val  = frm.AMFAdomain && frm.AMFAdomain.value.trim();

		if(isValid(domain_val) && domainverification){
			if(!(/^(?:(?:(?:[a-zA-z\-]+)\:\/{1,3})?(?:[a-zA-Z0-9])(?:[a-zA-Z0-9\-\.]){1,61}(?:\.[a-zA-Z]{2,})+|\[(?:(?:(?:[a-fA-F0-9]){1,4})(?::(?:[a-fA-F0-9]){1,4}){7}|::1|::)\]|(?:(?:[0-9]{1,3})(?:\.[0-9]{1,3}){3}))(?:\:[0-9]{1,5})?$/.test(domain_val))){
				showCommonError("AMFAdomain",I18N.get("IAM.AC.DOMAIN.INVALID.ERROR"));//no i18n
				return false;
			}
			$("#AMFAdomain").on("input", function(){
				clearCommonError("AMFAdomain");//no i18n
			});
				var domain_url = uriPrefix+"signin/v2/secondary/"+zuid+"/domain/"+e_domain+"?"+signinParams;//no i18n
				var jsonData =  {'domainsecauth':{'domain':domain_val}};//no i18n
				$("#domain_btn").addClass('changeloadbtn');
				sendRequestWithTemptoken(domain_url,JSON.stringify(jsonData),true,handleDomainresp, "POST");//no i18n
		}else{
			showCommonError("AMFAdomain",I18N.get("IAM.SIGNIN.FULL.DOMAIN.ERROR")); //no i18n
			$("#domain_btn").removeClass('changeloadbtn');
		}
		return false;
	}else{
		var email_val = frm.AMFAemail && frm.AMFAemail.value.trim();
		$("#AMFAemail").on("input", function(){
			clearCommonError("AMFAemail");//no i18n
		});
		if(isValid(email_val)){
			if(!isEmailIdSignin(email_val)){
				showCommonError("AMFAemail",I18N.get("IAM.ERROR.VALID.EMAIL")); //no i18n
				$("#domain_btn").removeClass('changeloadbtn');
				return false;
			}
			var email_url = uriPrefix+"signin/v2/secondary/"+zuid+"/domain/"+e_domain+"?"+signinParams;//no i18n
			var jsonData =  {'domainsecauth':{'contact_mail':email_val,"type":$("#AMFAemail").attr("type")}};//no i18n
			var encryptionJson = {
				path : "domainsecauth.contact_mail",//no i18n
				value : email_val
			}
			$("#domain_btn").addClass('changeloadbtn');
			sendRequestWithTemptoken(email_url,JSON.stringify(jsonData),true,handleAMFAemailresp, "PUT", encryptionJson, email_val);//no i18n
			return false;
		}else{
			showCommonError("AMFAemail",I18N.get("IAM.SIGNIN.FULL.DOMAIN.EMAIL.ERROR")); //no i18n
			$("#domain_btn").removeClass('changeloadbtn');
		}
		return false;
	}
}
function handleAMFAemailresp(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			$(".zoho_logo").addClass("logoCentre");
			$("#AMFAemail, .alterverify_head").hide();
			$(".AMFAemail_container").append("<div class='pptick_icon'></div><div class='AFMA_email_success'></div><div class='AFMA_email_success_decs'></div><div class='AFMA_email_success_decs1'></div>");
			$(".AFMA_email_success").text(I18N.get("IAM.AC.DOMAIN.INSTRUCTION.HEADING"));
			$(".AFMA_email_success_decs").html(formatMessage(I18N.get("IAM.SIGNIN.AMFA.EMAIL.SENT.SUCCESS"), $("#AMFAemail").val()));
			$(".AFMA_email_success_decs1").text(I18N.get("IAM.SIGNIN.AMFA.EMAIL.SENT.SUCCESS2"));
			
			$("#domain_btn, .hellouser").hide();
			$("#domain_btn").removeClass('changeloadbtn');
		}else{
			showCommonError("AMFAemail", jsonStr.localized_message);//no i18n
			$("#domain_btn").removeClass('changeloadbtn');
		}
		
	}else{
		showCommonError("AMFAemail",I18N.get("IAM.ERROR.GENERAL")); //no i18n
		$("#domain_btn").removeClass('changeloadbtn');
	}
	return false;
}
function handleDomainresp(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			$("#headin_content").text(I18N.get("IAM.SIGNIN.VERIFY.DOMAIN.TITLE"));
			AMFA_rdomain_resp = jsonStr.domainsecauth.r_domain;
			AMFA_edomain_resp = jsonStr.domainsecauth.e_domain;
			$("#alterverify_desc").html(formatMessage(I18N.get("IAM.SIGNIN.VERIFIED.DOMAIN.DESC"),AMFA_rdomain_resp));
			$("#AMFAdomain_container, #domain_btn").hide();
			$("#AMFAownership_container").show();
			$(".AMFA_verification_list").off();
			$(".AMFA_verification_list").on("click", function(){
				AMFAemailverification(this);
			});
			$("#domain_btn").removeClass('changeloadbtn');
		}else{
			showCommonError("AMFAdomain", jsonStr.localized_message);//no i18n
			$("#domain_btn").removeClass('changeloadbtn');
		}
		
	}else{
		showCommonError("AMFAdomain",I18N.get("IAM.ERROR.GENERAL")); //no i18n
		$("#domain_btn").removeClass('changeloadbtn');
	}
	return false;
}
function showAlterVerificationINfo(prob_mode){
	prob_mode = prob_mode == undefined ? prev_showmode : prob_mode;
	$("#oaalter_title_sec, #oaalter_title_first").show();
	$(".domain_step").hide();
	$(".oaalter_con_first, .oaalter_con_sec, .oaalter_con_third, .oaalter_con_fourth").removeClass("domain_alterinfo");
	$(".alterstep").html("");
	$(".alterstep").append('</div><div class="step1">1</div><div class="stepvertical"></div><div class="step2">2</div>');
	if(recoverymodes && recoverymodes.indexOf(prob_mode) != -1){
		$("#oaalter_title_sec").text(I18N.get("IAM.NEWSIGNIN.VERIFY.SEC.FACTOR."+prob_mode.toUpperCase()));
		$(".oaalter_con_sec").text(I18N.get("IAM.NEWSIGNIN.VERIFY.SEC.FACTOR.DESC."+prob_mode.toUpperCase()));
	}else{
		$("#oaalter_title_sec").text(I18N.get("IAM.NEWSIGNIN.VERIFY.SEC.FACTOR.TITLE"));
		$(".oaalter_con_sec").text(I18N.get("IAM.NEWSIGNIN.VERIFY.SEC.FACTOR.DESC"));
	}
	$("#alterverify_head .backoption").on("click", function(){
		showproblemsignin(true,false,true);
	});
	$(".fieldcontainer .hellouser, .fieldcontainer, #login .signin_head").hide();
	$('.devices,.devicedetails,#signin_box_info').hide();
	$("#login_id,#mfa_totp_container,#mfa_otp_container,#mfa_email_container,#waitbtn,#nextbtn,#mfa_scanqr_container,#mfa_push_container,#openoneauth,#yubikey_container").hide();
	clearInterval(_time);
	$("#contactSupport,#problemsigninui, #problemsignin_container").hide();
	$("#alternate_verification_info").show();
	$(".contactSupport").show();
	$("#contactSupport").hide();
	$(".stepvertical").css("height", $(".alterstep_con div").height() - $('.step1').height() +"px"); // no i18n
	prev_showmode = prob_mode;
	$(".proceed_btn").off();
	$(".proceed_btn").on("click",function(){
		showCurrentMode(prob_mode, 0, true);
	});
	oaNotInstalled = true;
	return false;
}
function backtoalterinfo(){
	showproblemsignin(true,false,true);
	deviceauthdetails[deviceauthdetails.resource_name].isAMFA ? showAlterVerificationDomainInfo() : showAlterVerificationINfo();
	return false;
}
function showallowedmodes(enablemode,mode_index){
	$('#enablemore').show();
	var lastviewed_mode = prev_showmode;
	prev_showmode= enablemode === "federated"? prev_showmode : enablemode; // no i18n
	if(enablemode === 'saml'){
		$('#enablemore').hide();
		$(".blur,.loader").show();
		var samlAuthDomain = deviceauthdetails.lookup.modes.saml.data[mode_index].auth_domain;
		enableSamlAuth(samlAuthDomain);
		$(".blur,.loader").hide();
		return false;
		
	}
	else if(enablemode === 'jwt'){
		$(".blur,.loader").show();
		var redirectURI = deviceauthdetails.lookup.modes.jwt.data[0].redirect_uri;
		switchto(redirectURI);
		$(".blur,.loader").hide();
		return false;
		
	}
	else if(enablemode === 'otp' || enablemode === 'email'){ //no i18n
		isShowEnableMore = true;
		$('#enablemore').hide();
		emobile = enablemode === 'email' ? deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].e_email : deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].e_mobile;
		rmobile = enablemode === 'email' ? deviceauthdetails[deviceauthdetails.resource_name].modes.email.data[0].email : identifyEmailOrNum(deviceauthdetails[deviceauthdetails.resource_name].modes.otp.data[0].r_mobile,true);
		if(deviceauthdetails[deviceauthdetails.resource_name].isUserName && enablemode === 'email'){
			checkEmailOTPInitiate();
			prev_showmode = lastviewed_mode;
			return false;
		}
		$("#resendotp").show();
		enableOTP(enablemode);
		return false;
	}
	else if(enablemode === 'totp'){ //no i18n
		isShowEnableMore = true;
		enableTotpAsPrimary();
		return false;
	}
	else if(enablemode === 'password' || enablemode === 'ldap'){
		$('#enableotpoption,#resendotp').hide();
		var isLdapPassword = enablemode == 'ldap' ? true : false;// no i18n
		showPassword(isLdapPassword);
		goBackToCurrentMode(true);	
	}
	else if(enablemode === "federated"){//No i18N
		var idp = deviceauthdetails.lookup.modes.federated.data[0].idp.toLowerCase();
		mode_index == 1 ? createandSubmitOpenIDForm(idp) : showMoreFedOptions();
		return false;
	}
	return false;
}
function goBackToCurrentMode(isLookup){
	$('#headtitle,.signin_head,.service_name,.fieldcontainer,#nextbtn').show();
	$(".devices,.devicedetails").hide();
	$('#problemsigninui,#recoverybtn, #problemsignin_container').hide();
	prev_showmode === "mzadevice" ? $(".tryanother,.devices").show() : $('.rnd_container').hide(); // no i18n
	var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
	if(isAMFA){
		allowedModeChecking();
		$(".tryanother, #contactSupport").hide();
	}
	if(!isLookup && !$(".addaptivetfalist").is(":visible") && !isRecovery){
		allowedModeChecking();
	}
	if($("#waitbtn").is(":visible")||$("#mfa_scanqr_container").is(":visible")){
		$("#nextbtn").hide();
	}
	if(!isClientPortal && prev_showmode=="totp"){$("#mfa_totp").click()}else{$("#"+prev_showmode).focus()}
}
function hideTryanotherWay(hideDevice){
   		$("#trytitle,.borderlesstry,#recoverybtn,#problemsignin,#verify_totp_container,#verify_qr_container,.contactSupport").hide();
   		isMobileonly ? $(".addaptivetfalist").removeClass("heightChange") : $(".addaptivetfalist").hide();
   		$(".service_name,.fieldcontainer,#headtitle").show();
   		prefoption = deviceauthdetails[deviceauthdetails.resource_name].modes.mzadevice.data[mzadevicepos] ? deviceauthdetails[deviceauthdetails.resource_name].modes.mzadevice.data[mzadevicepos].prefer_option : prefoption;
   		if(prefoption==="totp"){$("#nextbtn").show();}
   		$(".tryanother").show();
   		hideDevice ? $(".devices").hide() : $(".devices").show();
   		var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
   		if(isAMFA){
   			allowedModeChecking();
   			$(".tryanother").hide()
   		}
   		$('.signin_container').removeClass('mobile_signincontainer');
   		window.setTimeout(function(){
   			$(".blur").hide();
   			$('.blur').removeClass('dark_blur');
   		},250);
   		isTroubleSignin = false;
   		$('#verify_qrimg').attr('src','');
   		return false;
}
function showCaptcha(btnstatus,isSubmitted,submit_id){
	$("#captcha_container").show();
	clearCommonError('captcha');//no i18N
	changeButtonAction(btnstatus,isSubmitted);
	$("#"+submit_id).attr("tabindex", 1);
	$("#captcha").attr("tabindex", 2);
	$("#nextbtn").attr("tabindex", 3)
	if(isClientPortal){
		var iFrame = parent.document.getElementById('zs_signin_iframe');
		if(iFrame){
			iFrame.style.height=iFrame.contentWindow.document.body.scrollHeight +'px';
		}
	}
	$("#captcha").focus();
	return false;
}
function changeHip(cImg,cId) {
	cId = isValid(cId) ? cId : "captcha"; //no i18N
	var captchaReqUrl = uriPrefix+'/webclient/v1/captcha?';//no i18n
	var usecase = isSignupCaptcha ? "signup" : "signin"; //no i18n
	sendRequestWithCallback(captchaReqUrl, '{"captcha":{"digest":"'+cdigest+'","usecase":"'+usecase+'"}}', false, handleChangeHip); //No I18N
	de(cId).value = ''; //No I18N
}
function showHip(cdigest, cImg, cInput) {
	var captchimgsrc;
	 if(isSignupCaptcha){
		 captchimgsrc = isValid(cdigest) ? captchaPrefix+"/showcaptcha?digest="+cdigest+"&servicename="+serviceName : "../v2/components/images/hiperror.gif"; //no i18n
	 }else{
		 var captcha_resp = isValid(cdigest) ? doGet(uriPrefix+'/webclient/v1/captcha/'+cdigest,"darkmode="+Boolean(isDarkMode)) : "";//no i18n
		 if(IsJsonString(captcha_resp)) {
			 captcha_resp = JSON.parse(captcha_resp);
		 }
		 captchimgsrc = captcha_resp.cause==="throttles_limit_exceeded" || !isValid(cdigest) ? "../v2/components/images/hiperror.gif": captcha_resp.captcha.image_bytes;//no i18N
	 }
	 cImg = $("#bcaptcha_img").is(":visible") ? "bcaptcha_img" : $("#verifycaptcha_img").is(":visible") ? "verifycaptcha_img" : "captcha_img"; //No I18N
	 var inputField =  $("#bcaptcha_img").is(":visible") ? "bcaptcha" : $("#verifycaptcha_img").is(":visible") ? "verifycaptcha" : "captcha"; // no i18n
	 de(inputField).value = '';//no i18n
	 var hipRow = de(cImg); //No I18N
	 var captchaImgEle = document.createElement("img");
	 captchaImgEle.setAttribute("name", "hipImg");
	 captchaImgEle.setAttribute("id", "hip");
	 $('.reloadcaptcha').attr("title", I18N.get("IAM.NEW.SIGNIN.TITLE.RANDOM"));
	 captchaImgEle.setAttribute("align", "left");
	 captchaImgEle.setAttribute("src", captchimgsrc);
	 $(".signin_box").css("height","auto");
	 if(!isMobile && !isDarkMode){ $(captchaImgEle).css("mix-blend-mode","multiply");}//no i18N
	 $(hipRow).html(captchaImgEle);
}
function handleChangeHip(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		cdigest = jsonStr.digest;
		if(jsonStr.cause==="throttles_limit_exceeded"){
			cdigest = '';
			showHip(cdigest); //no i18N 
			showCaptcha(I18N.get("IAM.NEXT"),false);;//no i18N
			return false;
		}
		showHip(cdigest);
	}
	return false;
}

function handleMfaForIdpUsers(idpdigest,isMagicLink){
	if(isValid(idpdigest)){
		hideloader();
		$(".blur,.loader").show();
		$("#smartsigninbtn").addClass("hide");
		window.setTimeout(function(){$(".blur,.loader").hide();},1000);
		var modeName = isMagicLink ? "digest": "secondary";//No i18N
		var loginurl = uriPrefix+"/signin/v2/lookup/"+idpdigest+"?mode="+modeName;//no i18N
		var params = signinParams; //no i18N
		if(isValid(csrfParam)){
			params = params + '&' + csrfParam+'=' + getCookie(csrfCookieName);
		}
		var resp = getPlainResponse(loginurl,params);
		if(IsJsonString(resp)) {
			var jsonStr = JSON.parse(resp);
			var statusCode = jsonStr.status_code;
			if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
				$(".fed_2show,.line,#signuplink,#login_id").hide();
				$("#login_id_container,#showIDPs").slideUp(200);
				signinathmode = jsonStr.resource_name;
				isValid(jsonStr[jsonStr.resource_name].loginid) ? $('.username').text(identifyEmailOrNum(jsonStr[jsonStr.resource_name].loginid)) : $(".hellouser").hide();
				restrictTrustMfa = jsonStr[signinathmode].restrict_trust_mfa;
				if(isMagicLink){
					handleSigninUsingMagic(jsonStr);
					return false;
				}
				if(!restrictTrustMfa) {
					trustMfaDays = ''+jsonStr[signinathmode].trust_mfa_days;
				}
				if(typeof jsonStr[signinathmode].modes == 'undefined'){
					var successCode = jsonStr.code;
					if(successCode === "SI302"|| successCode==="SI200" ||successCode === "SI300" || successCode === "SI301" || successCode === "SI303"){
						switchto(jsonStr[signinathmode].redirect_uri);
						return false;
					}
				}
				allowedmodes = jsonStr[signinathmode].modes.allowed_modes;
				if(allowedmodes[0]==="mzadevice"){
					prev_showmode = allowedmodes[0];
					secondarymodes = allowedmodes;
					mzadevicepos = 0;
					callmode = "secondary";	//no i18n
					zuid = jsonStr.lookup.identifier;
					temptoken = jsonStr.lookup.token;
					deviceauthdetails=jsonStr;
					handleSecondaryDevices(allowedmodes[0]);
					enableMyZohoDevice(jsonStr);
					return false;
				}else{
					handlePasswordDetails(resp);
					return false;
				}
			}else{
				if(jsonStr.cause==="throttles_limit_exceeded"){
					showCommonError("login_id",jsonStr.localized_message); //no i18n
					return false;
				}
				showCommonError("login_id",jsonStr.localized_message); //no i18n
				return false;
			}
		}
		return false;
	}
	return false;
}
function handleSigninUsingMagic(resp){
	var lookupData = resp[resp.resource_name];
	digest = lookupData && lookupData.digest;
	zuid = lookupData && lookupData.identifier;
	var magic_email = lookupData && lookupData.email;
	var magic_portanl_name = lookupData && lookupData.portal_name;
	temptoken = lookupData && lookupData.token;
	var magic_name = magic_email.split("@")[0];
	var magicLinkTplElement = '<div class="signin_head"><span id="headtitle"></span><div class="service_name"></div></div><div id="multiDC_container"><div class="profile_head"><div class="profile_dp" id="profile_img"><label class="file_lab"><img id="dp_pic" draggable="false" src="/v2/components/images/user_2.png" style="width: 100%; height: 100%;"></label></div><div class="profile_info"><div class="profile_name" id="profile_name"></div><div class="profile_email" id="profile_email"></div></div><div class="DC_info" style="display:none"><span class="icon-datacenter"></span></div></div></div><button class="btn blue" id="magicLink_btn"><span id="magicLink_btnText"></span></button>';//no18n
	var magicLinkContainer = document.createElement("div");
	magicLinkContainer.setAttribute("id", "magicLink_container");
	magicLinkContainer.setAttribute("style", "display:none");
	magicLinkContainer.innerHTML=magicLinkTplElement;
	$("#signin_flow").append(magicLinkContainer);
	$("#magicLink_container #headtitle").html(I18N.get("IAM.SIGNIN.VIA.MAGIC.LINK"));
	$("#magicLink_container .service_name").html(formatMessage(I18N.get("IAM.SIGNIN.VIA.MAGIC.LINK.DESC"),magic_portanl_name));
	$("#profile_email").html(encodeURI(magic_email));
	$("#profile_name").html(encodeURI(magic_name));
	$("#magicLink_btnText").html(I18N.get("IAM.SIGN_IN"));
	$("#signin_div, .titlename").hide();
	$("#magicLink_container").show();
	magicEndpoint = uriPrefix+"/signin/v2/primary/"+zuid+"/digest/"+magicdigest+"?digest="+digest+"&"+signinParams;//no i18N
	$("#magicLink_btn").on("click", function(){
		submitSigninUsingMagic();
	});
	return false;
}
function submitSigninUsingMagic(){
	$("#magicLink_container").hide();
	$("#signin_div, .titlename").show();
	sendRequestWithCallback(magicEndpoint,"",true,handlePasswordDetails);
}
function tryAnotherway(trymode){
	if(!($('#verify_'+trymode+'_container').is(":visible"))){
		$('#verify_totp').val('');
		clearCommonError('verify_totp'); // no i18n
		prefoption = trymode === 'qr' ? 'scanqr' : "totp"; // no i18n
		$('.verify_totp,.verify_qr').slideUp(200);
		$('.verify_'+trymode).slideDown(200);
		$('.optionstry').removeClass("toggle_active");
		$('.verify_'+trymode).parent().addClass("toggle_active");
		if(trymode === 'totp'){
			if(!isClientPortal){enableSplitField("verify_totp",totp_size,I18N.get("IAM.NEW.SIGNIN.VERIFY.CODE"))}
			else{$('#verify_totp').focus();}
		}
		if(trymode === 'qr' &&  $('#verify_qrimg').attr('src') === ""){
			$('.verify_qr .loader,.verify_qr .blur').show();
			enableQRCodeimg();
		}
	}
	return false;
}
function showResendPushInfo(){
	$(".loadwithbtn").show();
	$(".waitbtn .waittext").text(I18N.get("IAM.NEW.SIGNIN.WAITING.APPROVAL"));
	$("#waitbtn").attr("disabled", true);
	showTopNotification(formatMessage(I18N.get("IAM.RESEND.PUSH.MSG")));
	clearTimeout(oneauthgrant);
	oneauthgrant = window.setTimeout(function (){
		showOABackupRedirection(false);
	}, 45000);
	window.setTimeout(function (){
		$(".waitbtn .waittext").text(I18N.get("IAM.PUSH.RESEND.NOTIFICATION"));
		$(".loadwithbtn").hide();
		$("#waitbtn").attr("disabled", false);
		isFormSubmited = false;
		return false;
		
	},25000);
	return false;
}
function showTrustBrowser(){
	prefoption = prefoption ==="ONEAUTH_PUSH_NOTIF" ? "push" : prefoption === "ONEAUTH_TOTP" ? "totp" : prefoption === "ONEAUTH_SCAN_QR" ? "scanqr" : prefoption === "ONEAUTH_FACE_ID" ? "faceid": prefoption === "ONEAUTH_TOUCH_ID" ? "touchid" : prefoption;//no i18N
	prefoption = isValid(prefoption) ? prefoption : allowedmodes[0];//no i18n
	$(".mod_sername").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.TRUST.HEADER"),trustMfaDays)); // no i18n
	$(".sec_note").text(I18N.get("IAM.NEW.SIGNIN.TRUST.NOTE")); // no i18n
	$("#signin_div,.rightside_box,.zoho_logo,.loadwithbtn").hide();
	hideOABackupRedirection();
	$(".trustbrowser_ui,.trustbrowser_ui #headtitle,.zoho_logo,.mod_sername").show();
	$(".trustbrowser_ui .signin_head").show();
	$(".signin_container").addClass("trustdevicebox");
	$(".signin_box").css("minHeight","auto");
	$(".signin_box").css("padding","40px");
	return false;
}
function checkEmailOTPInitiate(notbackneeded){
	$(".loader,.blur").hide();
	$('#login,#enablemore').hide();
	$('.emailcheck_head').show();
	$("#emailcheck").val("");
	if(allowedmodes.indexOf("password")!= -1 || allowedmodes.indexOf("ldap")!= -1){$("#emailcheck_container .backoption").show()}else{$("#emailcheck_container .backoption").hide()}
	$("#emailcheck_container").show();
	$("#emailverify_desc").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.VERIFY.EMAIL.DESC"),rmobile));
	clearCommonError('emailcheck'); // no i18n
	$("#emailcheck").focus();
	if(notbackneeded){
		$('.backoption').hide();
	}
	return false;
}
function hideEmailOTPInitiate(){
	$('#login').show();
	$('#enablemore').show();
	$("#emailcheck_container, .resendotp").hide();
	signinathmode = $("#password").is(":visible") ? $(".blueforgotpassword").is(":visible") ? "passwordauth" : "ldappasswordauth" : signinathmode ;//no i18n
	return false;
}
function verifyEmailValid(){
	generateOTPAuth(false,"EMAIL"); // no i18n
	return false;
}
function enableEmailOTPDetails(resp){
	var jsonStr = JSON.parse(resp);
	signinathmode = jsonStr.resource_name;
	var statusCode = jsonStr.status_code;
	if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
		var successCode = jsonStr.code;
		if(successCode === "SI201"|| successCode==="SI200" ){
			mdigest = jsonStr[signinathmode].mdigest;
			$(".emailverify_head .backup_desc").html(formatMessage(I18N.get("IAM.NEW.SIGNIN.VERIFY.EMAIL.OTP.TITLE"),rmobile));
			$("#emailverify_container,.emailverify_head").show();
			$("#emailcheck_container").hide();
			if(!isClientPortal){enableSplitField("emailverify",otp_length,I18N.get("IAM.VERIFY.CODE"))}
			showTopNotification(formatMessage(I18N.get("IAM.NEW.SIGNIN.OTP.SENT"),rmobile));
			$("#emailverify_container .showmoresigininoption").show();
			$("#emailverify_container .signinwithjwt,#emailverify_container .signinwithsaml,#emailverify_container #signinwithpass").hide();
			$(".resendotp").show();
			resendotp_checking();
		}
	}
	else{
		if(jsonStr.cause==="throttles_limit_exceeded"){
			showCommonError("emailcheck",jsonStr.localized_message); // no i18n
			return false;
		}
		var errorMessage = jsonStr.localized_message;
		showCommonError("emailcheck",errorMessage); // no i18n
		return false;
	}
}
function verifyEmailOTP(){
	if(isClientPortal){var OTP_CODE = $("#emailverify").val();}
	else{var OTP_CODE = document.getElementById("emailverify").firstChild.value;}
	if(!isClientPortal && !isWebAuthNSupported()){ 
		//if yubikey not supported in user's browser, block signin on first factor  form and show not supported error
		showTopErrNotification(I18N.get("IAM.WEBAUTHN.ERROR.BrowserNotSupported"));
		changeButtonAction(I18N.get("IAM.NEW.SIGNIN.VERIFY"),false);
		return false;
	}
	if(!isValid(OTP_CODE)){
			showCommonError("emailverify",I18N.get("IAM.NEW.SIGNIN.INVALID.OTP.MESSAGE.EMPTY"));//No I18N
			return false;	
	}
	if(isNaN(OTP_CODE) || !isValidCode(OTP_CODE)) {
			showCommonError("emailverify",I18N.get("IAM.NEW.SIGNIN.INVALID.EMAIL.MESSAGE.NEW"));//no i18n
			return false;
	}
	if( /[^0-9\-\/]/.test( OTP_CODE ) ) {
		showCommonError("emailverify",I18N.get("IAM.SIGNIN.ERROR.INVALID.VERIFICATION.CODE"));//No I18N
		return false;
	}
	var loginurl = uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/otp/"+emobile+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	var jsonData = { 'otpauth' : { 'code' : OTP_CODE, 'is_resend' : false } };//no i18N
	sendRequestWithCallback(loginurl,JSON.stringify(jsonData),true,handlePasswordDetails,"PUT");//no i18n
	return false;
}
function hideEmailOTPVerify(){
	$("#emailverify_container").hide();
	$("#emailcheck_container").show();
	clearCommonError('emailverify');//No i18N
	return false;
}
function getbackemailverify(){
	$("#emailcheck_container,.emailverify_head").show();
	clearCommonError('emailcheck'); // no i18n
    $("#login").hide();
    return false;
}
function updateTrustDevice(trust){
	trust ? $('.trustbtn .loadwithbtn').show() : $('.notnowbtn .loadwithbtn').show()
	trust ? $('.trustbtn .waittext').addClass('loadbtntext') : $('.notnowbtn .waittext').addClass('loadbtntext');
	$(".trustdevice").attr("disabled", true);
	var loginurl= uriPrefix+"/signin/v2/secondary/"+zuid+"/trust?" + signinParams;//no i18N
	var jsonData = {'trustmfa':{'trust':trust }};//no i18n
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleTrustDetails);
	return false;
}
function handleTrustDetails(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			signinathmode = jsonStr.resource_name;
			var successCode = jsonStr.code;
			if(successCode === "SI302"|| successCode==="SI200" ||successCode === "SI300" || successCode === "SI301" || successCode === "SI303" || successCode === "SI305" || successCode === "SI507" || successCode === "SI509"  || successCode === "SI506"){
				switchto(jsonStr[signinathmode].redirect_uri);
				return false;
			}
			return false;
		}else{
			$(".trustdevice").attr("disabled", false);
			$('.trustbtn .loadwithbtn,.notnowbtn .loadwithbtn').hide();
			$('.trustbtn .waittext,.notnowbtn .waittext').removeClass('loadbtntext');
			showTopErrNotification(jsonStr.localized_message);
			return false;
		}
		return false;
	}
}

function getQueryParams(queryStrings){
	var vars={};
	queryStrings=queryStrings.substring(queryStrings.indexOf('?')+1);
	var params = queryStrings.split('&');
	for (var i = 0; i < params.length; i++) {
        var pair = params[i].split('=');
        if(pair.length==2){
        	vars[pair[0]] = decodeURIComponent(pair[1]);        	
        }else{
        	vars[pair[0]] = ""; 
        }
    }
	return vars;
}

function createandSubmitOpenIDForm(idpProvider) 
{
	if(isValid(idpProvider)) {
		var oldForm = document.getElementById(idpProvider + "form");
		if(oldForm) {
			document.documentElement.removeChild(oldForm);
		}
		var form = document.createElement("form");
		var idpurl = "/accounts/fsrequest";//No I18N
		if(isClientPortal){
			if(idpProvider.toUpperCase() === "ZOHO"){
				idpurl = uriPrefix+"/clientidprequest"; //No I18N
			}else{
				idpurl = IDPRequestURL;
			}
		}
		form.setAttribute("id", idpProvider + "form");
		form.setAttribute("method", "POST");
	    form.setAttribute("action", idpurl);
	    form.setAttribute("target", "_parent");
		
		var hiddenField = document.createElement("input");
		hiddenField.setAttribute("type", "hidden");
		hiddenField.setAttribute("name", "provider");
		hiddenField.setAttribute("value", idpProvider.toUpperCase()); 
		form.appendChild(hiddenField);
		
		if(selectedRegionalDC){
			hiddenField = document.createElement("input");
			hiddenField.setAttribute("type", "hidden");
			hiddenField.setAttribute("name", "dc");
			hiddenField.setAttribute("value", selectedRegionalDC); 
			form.appendChild(hiddenField);
		}
        
		hiddenField = document.createElement("input");
		hiddenField.setAttribute("type", "hidden");
		hiddenField.setAttribute("name", csrfParam);
		hiddenField.setAttribute("value", getCookie(csrfCookieName)); 
		form.appendChild(hiddenField);
        
		var params=getQueryParams(location.search);
		for(var key in params) {
			if(isValid(params[key]) && key != "recoveryurl") {
				hiddenField = document.createElement("input");
				hiddenField.setAttribute("type", "hidden");
				hiddenField.setAttribute("name", key);
				hiddenField.setAttribute("value", params[key]);
				form.appendChild(hiddenField);
			}
		}
		
	   	document.documentElement.appendChild(form);
	  	form.submit();
	}
}
function goToForgotPassword(isIP){
	
	var tmpResetUrl= isIP?getIPRecoveryURL():getRecoveryURL(); 
	var LOGIN_ID = (isIP ? $(".resetIP_container .username") : $(".username"))[0].innerText;
	isValid(LOGIN_ID) && isEmailIdSignin(LOGIN_ID) ? "" :LOGIN_ID= de('login_id').value.trim();
	if(isUserName(LOGIN_ID) && isEmailIdSignin(LOGIN_ID) && isPhoneNumber(LOGIN_ID.split('-')[1]) || isPhoneNumber(LOGIN_ID.split('-')[1]) && LOGIN_ID.split('-')[0].indexOf("+") != -1) {
		showCommonError("login_id",I18N.get("IAM.NEW.SIGNIN.INVALID.LOOKUP.IDENTIFIER"));//no i18n
		return false;
	}
	var redirectedFrom = signinathmode == 'lookup' ? "primary" : "secondary"; // no i18n
	if(de('login_id') && (isUserName(LOGIN_ID) || isEmailIdSignin(LOGIN_ID) || isPhoneNumber(LOGIN_ID.split("-")[1]))){
		var oldForm = document.getElementById("recoveryredirection");
		if(oldForm) {
			document.documentElement.removeChild(oldForm);
		}
		var login_id = !emailOnlySignin && (isPhoneNumber(LOGIN_ID) || (hiddenCountrycode && /^[0-9-]+$/.test(LOGIN_ID))) ? (hiddenCountrycode ? (LOGIN_ID.indexOf("-") !== -1 ? LOGIN_ID.split("-")[1] : LOGIN_ID) : $("#country_code_select").val().split("+")[1] + '-' + LOGIN_ID) : LOGIN_ID;
		var form = document.createElement("form");
		form.setAttribute("id", "recoveryredirection");
		form.setAttribute("method", "POST");
	    form.setAttribute("action", tmpResetUrl);
	    if(!isClientPortal){
	    	form.setAttribute("target", "_parent");
	    } else {
	    	form.setAttribute("target", "_self");
	    }
		
		var hiddenField = document.createElement("input");
		hiddenField.setAttribute("type", "hidden");
		hiddenField.setAttribute("name", "LOGIN_ID");
		hiddenField.setAttribute("value", login_id ); 
		form.appendChild(hiddenField);
		
		if(!isIP){
			hiddenField = document.createElement("input");
	        hiddenField.setAttribute("type", "hidden");
	        hiddenField.setAttribute("name", "redirectedFrom");
	        hiddenField.setAttribute("value", redirectedFrom); 
	        form.appendChild(hiddenField);
		}
		
	   	document.documentElement.appendChild(form);
	  	form.submit();
	  	return false;
	}
	window.location.href = !isIP ? tmpResetUrl : tmpResetUrl + "?redirectedFrom="+redirectedFrom;
}
function iamMovetoSignUp(signupUrl,login_id){
	if(isDarkMode){if(!(signupUrl.indexOf("darkmode=true") != -1)){signupUrl += "&darkmode=true"}}
	if(isValid(login_id)){
		var xhr = new XMLHttpRequest();
		xhr.open("POST", signupUrl, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('X-ZCSRF-TOKEN',csrfParam+'='+euc(getCookie(csrfCookieName)));
		xhr.onreadystatechange=function() {
		    if(xhr.readyState==4) {
	            if(xhr.status === 200){
	                triggerPostRedirection(signupUrl,login_id);
	                return false;
	            }
	            else{
	                window.location.href= signupUrl;
				    return false;
	            }
		    }
		};
		xhr.send(); 
	}
	else{
        window.location.href= signupUrl;
	    return false;
    }
}
function register(){
	window.location.href= signup_url;
	return false;
}
function showBackupVerificationCode(){
	$('#login,.fed_2show,#recovery_container,#passphrase_container,#bcaptcha_container').hide();
	hideBkCodeRedirection();
	$('#backup_container,.backuphead,#backupcode_container').show();
	$("#backupcode").focus();
	$('#backup_title').html("<span class='icon-backarrow backoption backup_title_backop'></span>"+I18N.get('IAM.TFA.USE.BACKUP.CODE'));
	$('.backup_desc').html(I18N.get("IAM.NEW.SIGNIN.BACKUP.HEADER"));
	signinathmode = "recoverycodesecauth"; // no i18n
	allowedmodes.indexOf("passphrase") != -1 ? $('#recovery_passphrase').show() : $('#recovery_passphrase').hide();
	$('.backup_title_backop').on("click", function(){
		hideCantAccessDevice();
	});
	return false;
}
function goBackToProblemSignin(){
	$("#recovery_container").hide();
	$('.fed_2show,#recovery_container,#backup_container').hide();
	if(isSecondary){
		isMobileonly ? $(".addaptivetfalist").removeClass("heightChange") : $(".addaptivetfalist").hide();
	}
	signinathmode = oldsigninathmode;
	$('#login').show();
	if(isClientPortal){
	$('.alt_signin_head').show();
	}
	return false;
}
function showCantAccessDevice(){
	isTroubleSignin = false;
	showHideEnforcePop(false);
	$('.devices,.devicedetails').hide();
	clearInterval(_time);
	clearTimeout(oneauthgrant);
	$('.signin_container').removeClass('mobile_signincontainer');
	allowedmodes.indexOf('passphrase') === -1 ? $('#passphraseRecover').hide() : $('#passphraseRecover').show();
	allowedmodes.indexOf('recoverycode') === -1 ? $('#recoverOption').hide() : $('#recoverOption').show();
	window.setTimeout(function(){
		$(".blur").hide();
		$('.blur').removeClass('dark_blur');
	},100);
	oldsigninathmode = signinathmode;
	$('#login,.fed_2show,#backup_container,.backuphead').hide();
	if(isClientPortal){
		$(".alt_signin_head").hide();
	}
	$('#recovery_container,#recoverytitle,.recoveryhead').show();
	return false;
}
function hideCantAccessDevice(ele){
	if(isRecovery){
		$(".contactSupport").show();
	}
    $("#recovery_container").show();
    if($("#backup_container").is(":visible")){$("#backup_container").hide();return false;}
    else if(ele != undefined){
    	var ele = isValid(ele.parentElement.parentElement.id) ? ele.parentElement.parentElement.id : ele.parentElement.parentElement.parentElement.id;
    	$("#"+ele).hide();
    }
    return false;
}
function verifyBackupCode(){
	var isBcaptchaNeeded = $("#bcaptcha_container").is(":visible");
	if(isBcaptchaNeeded){
		var bcaptchavalue = de('bcaptcha').value.trim();//no i18N
		if(!isValid(bcaptchavalue)) {
			showCommonError("bcaptcha",I18N.get("IAM.SIGNIN.ERROR.CAPTCHA.REQUIRED"), true);//no i18n
			return false;
		}
		if( /[^a-zA-Z0-9\-\/]/.test( bcaptchavalue ) ) {
			changeHip('bcaptcha_img','bcaptcha');// no i18n
			showCommonError("bcaptcha",I18N.get("IAM.SIGNIN.ERROR.CAPTCHA.INVALID"));//no i18n
			return false;
		}
    }
	if(signinathmode=== "passphrasesecauth"){
		var passphrase = $("#passphrase").val().trim();
		if(!isValid(passphrase)) {
			showCommonError("passphrase",I18N.get("IAM.NEW.SIGNIN.ENTER.VALID.PASSPHRASE.CODE"));//no i18n
			return false;
		}
		var loginurl=uriPrefix+"/signin/v2/secondary/"+zuid+"/passphrase?"+signinParams; // no i18n
		if(isBcaptchaNeeded){loginurl += "&captcha=" +bcaptchavalue+"&cdigest="+cdigest;}
		var recsalt = deviceauthdetails[deviceauthdetails.resource_name].modes.passphrase && deviceauthdetails[deviceauthdetails.resource_name].modes.passphrase.rec_salt;
		if(typeof recsalt !== 'undefined'){
			var derivedKey = sjcl.codec.base64.fromBits(sjcl.misc.pbkdf2(passphrase, sjcl.codec.base64.toBits(recsalt), 100000, 32 * 8));
			var jsonData =  {'passphrasesecauth':{'secret_key': derivedKey }} // no i18n
		}else{
			var jsonData =  {'passphrasesecauth':{'pass_phrase':passphrase }} // no i18n
		}
		$("#backupVerifybtn span").addClass("zeroheight");
		$("#backupVerifybtn").addClass('changeloadbtn');
		$("#backupVerifybtn").attr("disabled", true);
		sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handlePassphraseDetails);
		return false;
	}
	var backupcode = $("#backupcode").val().trim();
	backupcode = backupcode.replace(/\s/g, "");
	var objRegExp = /^([a-zA-Z0-9]{12})$/;
	if(!isValid(backupcode)){
		showCommonError("backupcode",I18N.get("IAM.EMPTY.BACKUPCODE.ERROR"));//no i18n
		return false;
	}
	if(!objRegExp.test(backupcode)){
		showCommonError("backupcode",I18N.get("IAM.NEW.SIGNIN.ENTER.VALID.BACKUP.CODE"));//no i18n
		return false;
	}
	var loginurl=uriPrefix+"/signin/v2/secondary/"+zuid+"/recovery?"+signinParams;//no i18n
	if(isBcaptchaNeeded){loginurl += "&captcha=" +bcaptchavalue+"&cdigest="+cdigest;}
	var isAMFA = deviceauthdetails[deviceauthdetails.resource_name].isAMFA;
	var jsonData = isAMFA ?  {'recoverycodesecauth':{'code':backupcode, 'isAMFA' : true }} :  {'recoverycodesecauth':{'code':backupcode }};//no i18n
	$("#backupVerifybtn span").addClass("zeroheight");
	$("#backupVerifybtn").addClass('changeloadbtn');
	$("#backupVerifybtn").attr("disabled", true);
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleBackupVerificationDetails);	
	return false;
}
function handleBackupVerificationDetails(resp){
		if(IsJsonString(resp)) {
			$("#backupVerifybtn span").removeClass("zeroheight");
			$("#backupVerifybtn").removeClass('changeloadbtn');
			$("#backupVerifybtn").attr("disabled", false);
			var jsonStr = JSON.parse(resp);
			var statusCode = jsonStr.status_code;
			signinathmode = jsonStr.resource_name;
			if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
				var successCode = jsonStr.code;
				var statusmsg = jsonStr.recoverycodesecauth.status;
				if(statusmsg==="success"){
					updateTrustDevice(false);
					return false;
				}else if(successCode==="P500"||successCode==="P501"||successCode==="P506"){//no i18N
					temptoken = jsonStr[signinathmode].token;
					showPasswordExpiry(jsonStr[signinathmode].pwdpolicy, successCode);
					return false;
				}
				else{
					showCommonError("backupcode",jsonStr.localized_message);//no i18n
					return false;
				}
			}else{
				if(jsonStr.cause==="throttles_limit_exceeded"){
					showCommonError("backupcode",jsonStr.localized_message); //no i18n
					return false;
				}
				var error_resp = jsonStr.errors[0];
				var errorCode=error_resp.code;
				var errorMessage = jsonStr.localized_message;
				if(errorCode==="IN107" || errorCode === "IN108"){
					$(".fed_2show,.line").hide();
					$("#bcaptcha_container").show();
					$("#bcaptcha").focus();
					cdigest=jsonStr.cdigest;
					showHip(cdigest, 'bcaptcha_img'); //no i18N
					clearCommonError('bcaptcha');//no i18N
					changeButtonAction(I18N.get("IAM.NEW.SIGNIN.VERIFY"),false);
					if( errorCode === "IN107"){
						showCommonError("bcaptcha",errorMessage); //no i18n	
					}
					return false;
				}else if(errorCode === "R303"){ //no i18N
					showRestrictsignin();
					return false;
				}else{
					showCommonError("backupcode",errorMessage);//no i18n
					return false;					
				}
			}
		return false;
		}
}
function removeParamFromQueryString(param){
	if(isValid(queryString)) {
		var prefix = encodeURIComponent(param);
		var pars = queryString.split(/[&;]/g);
		for (var i = pars.length; i-- > 0;) {
    		var paramObj = pars[i].split(/[=;]/g);
    		if(prefix === paramObj[0]) {
				pars.splice(i, 1);
			}
		}	
		if (pars.length > 0) {
			return pars.join('&');
		}
	}
	return "";
}
function allowedModeChecking(){
	if(secondarymodes.length == 1 || (secondarymodes[1] == "recoverycode" && secondarymodes.length == 2)){
		if(secondarymodes[1] == "recoverycode"){
			$('#recoverOption').show();	
		}
		$('#recoverybtn').show();
		$('#problemsignin').hide();
	}
	else{
		$('#problemsignin').show();
		$('#recoverybtn').hide();
	}
	if(isSecondary){
		$('#problemsignin').show();
		$('#recoverybtn').hide();
	}
	if(secondarymodes.indexOf("passphrase") != -1  && secondarymodes.length <= 3){
		$('#recoverybtn').show();
		$('#problemsignin').hide();
	}
	return false;

}
function showCurrentMode(pmode,index){
	$(".contactSupport").hide();
	mobposition = emailposition = mzadevicepos =undefined;
	$('.devices,.devicedetails').hide();
	$("#mfa_totp_container,#mfa_otp_container,#mfa_email_container,#waitbtn,#nextbtn,#mfa_scanqr_container,#mfa_push_container,#openoneauth,#yubikey_container, #qrOneContent, #qrOrLine,#alternate_verification_info").hide();
	clearInterval(_time);
	$(".tryanother").hide();
	prev_showmode = pmode === "federated" ? prev_showmode : pmode; // no i18n
	clearCommonError(pmode)
	if(callmode=="secondary"){clearCommonError("mfa_"+pmode)}
	var authenticatemode = deviceauthdetails.passwordauth === undefined ? "lookup" : "passwordauth"; // No I18n
	if(pmode==="otp" || pmode==="email"){
		triggeredUser = true;
		$(".loader,.blur, .resendotp").show();
		var jsonPack = deviceauthdetails[deviceauthdetails.resource_name];
		emobile= pmode==="otp" ? jsonPack.modes.otp.data[index].e_mobile : jsonPack.modes.email.data[index].e_email;
		rmobile= pmode==="otp" ? identifyEmailOrNum(jsonPack.modes.otp.data[index].r_mobile,true) : jsonPack.modes.email.data[index].email;
		if(isPasswordless && deviceauthdetails.lookup.isUserName && pmode == "email"){
			checkEmailOTPInitiate(true);
			return false;
		}else if(isPasswordless){
			showAndGenerateOtp(pmode);
		}
		else{
			generateOTP(false,pmode)
		}
		pmode==="email" ? emailposition = index : mobposition = index; // no i18n
		isPrimaryDevice = true;
		if(isPasswordless){
			$(".service_name").html(formatMessage(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.OTP"),rmobile));
			var showingmodes = secondarymodes;
			if(showingmodes == 1){
				showingmodes[0] == "otp"  || showingmodes[0] == "email" ? $("#enableotpoption").show() : "";//no i18n
			}else{
				$("#enablemore").show();
			}
		}
	}
	goBackToProblemSignin();
	if(pmode==="totp"){//No i18N
		enableTOTPdevice(deviceauthdetails,false,false);
		signinathmode="totpsecauth";//no i18N
		if(isPasswordless){
			signinathmode = "totpauth"; // no i18n
			fallBackForSingleMode(pmode,validateAllowedMode(pmode,"mzadevice").option); // no i18n
		}
	}else if(pmode==="oadevice"){//No i18N
		$('.secondary_devices').uvselect('destroy');
		handleSecondaryDevices(pmode);
		$(".loader,.blur").show();
		isResend = false;
		signinathmode =authenticatemode;
		oadevicepos = index;
		enableOneauthDevice(deviceauthdetails,oadevicepos);
	}else if(pmode==="yubikey"){//No i18N
		$(".loader,.blur").show();
		signinathmode =authenticatemode;
		enableYubikeyDevice(deviceauthdetails);
	}else if(pmode === "mzadevice"){//No i18N
		$('.secondary_devices').uvselect('destroy');
		handleSecondaryDevices(pmode);
		$(".loader,.blur").show();
		isResend = false;
		mzadevicepos = index;
		prefoption = deviceauthdetails[deviceauthdetails.resource_name].modes.mzadevice.data[mzadevicepos].prefer_option;
		enableMyZohoDevice(deviceauthdetails, prefoption);
		if(prefoption === 'totp'){
			goBackToCurrentMode(true);
			if (isRecovery) { $('#problemsignin,#recoverybtn,.tryanother').hide();}
			return false;
		}
	}else if(pmode === "password" || pmode === "ldap"){//No i18N
		showPasswordContainer(pmode === "ldap");//no i18n
		$(".service_name").html(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.PASSWORD"));
	}else if(pmode === "federated"){//No i18N
		var idp = deviceauthdetails.lookup.modes.federated.data[0].idp.toLowerCase();
		index === 1 ? createandSubmitOpenIDForm(idp) : showMoreFedOptions();
		return false;
	}else if(pmode === "saml"){ // no i18n
		$(".blur,.loader").show();
		var samlAuthDomain = deviceauthdetails[deviceauthdetails.resource_name].modes.saml.data[index].auth_domain;
		enableSamlAuth(samlAuthDomain);
		$(".service_name").html(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.SAML"));
		$(".blur,.loader").hide();
		return false;
	}
	else if(pmode === "jwt"){ // no i18n
		var redirectURI = deviceauthdetails[deviceauthdetails.resource_name].modes.jwt.data[0].redirect_uri;
		$(".service_name").html(I18N.get("IAM.NEWSIGNIN.BACKUP.DESC.JWT"));
		switchto(redirectURI);
	}
	if(pmode != 'mzadevice' && pmode != 'oadevice'){
		$('.deviceparent').addClass('hide');
	}
	goBackToCurrentMode();
	if(isPasswordless){
		$("#headtitle").html(I18N.get("IAM.NEWSIGNIN.VERIFY.FIRST.FACTOR"));
		$(".service_name").addClass("extramargin");
		hideTryanotherWay(true);
		$('#problemsignin,#recoverybtn,.tryanother,#enableoptionsoneauth').hide();
		pmode != 'mzadevice' ? $(".backupstep").show() : "";
	}else if(isRecovery){
		if($("#headtitle .backoption").length < 1){
			$("#headtitle").html("<span class='icon-backarrow backoption'></span>" + $("#headtitle").html());
		} 
		$("#headtitle .backoption").on("click", function(){
			hideCantAccessDevice(this);
		});
	}
	if(isRecovery) {$('#problemsignin,#recoverybtn,.tryanother').hide();}
	return false;
}
function showPasswordContainer(isLdapPassword){
	$("#nextbtn").attr("disabled", false);
	$("#password").val("");
	clearCommonError("password");//no i18n
	$('#password_container,#enableforgot').show();
	$('#enablesaml,#enableotpoption,.textbox_actions,#otp_container').hide();
	$('#password_container').removeClass('zeroheight');
	$('#nextbtn').removeClass('changeloadbtn');
	$('#headtitle').text(I18N.get("IAM.SIGN_IN"));
	$('.service_name').removeClass('extramargin');
	$('.service_name').html(formatMessage(I18N.get("IAM.NEW.SIGNIN.SERVICE.NAME.TITLE"),displayname));
	$("#nextbtn span").removeClass("zeroheight");
	$("#nextbtn span").text(I18N.get('IAM.SIGN_IN'));
	$('.username').text(identifyEmailOrNum());
	if(isPasswordless && !isRecovery)  { allowedModeChecking() };
	$('.signin_head').css('margin-bottom','30px');
	$('#password').focus();
	$("#enableotpoption,#enablesaml,#enablejwt,#enablemore, #enablepass, #enableldap").hide();
	var showingmodes = secondarymodes;
	if(showingmodes.length == 3){
		if(isLdapPassword){
			showingmodes.indexOf("otp") != -1  || showingmodes.indexOf("email") != -1 ? $("#enableotpoption").show() : showingmodes.indexOf("password") != -1 ? $("#enablepass").show() : ""; // no i18n
		}else {
			showingmodes.indexOf("otp") != -1  || showingmodes.indexOf("email") != -1 ? $("#enableotpoption").show() : showingmodes.indexOf("ldap") != -1 ? $("#enableldap").show() : ""; // no i18n
		}
		if(showingmodes.indexOf("otp") != -1){
			$("#signinwithotp").html(I18N.get("IAM.NEW.SIGNIN.USING.MOBILE.OTP"));
		}else if(showingmodes.indexOf("email") != -1){
			$("#signinwithotp").html(I18N.get("IAM.NEW.SIGNIN.USING.EMAIL.OTP"));
		}
	}else if(showingmodes.length > 2){
		$("#enablemore").show();
	}
	if(isLdapPassword){
		signinathmode="ldappasswordauth";//no i18N
		$('.blueforgotpassword').hide();
		prev_showmode = "ldap";// no i18n
		$("#password").attr("placeholder",I18N.get("IAM.LDAP.PASSWORD.PLACEHOLDER"));
		isLdapVisible = true;
		$("#enableldap").hide();
		if(btnAllowedModes() == 2){
			if(allowedmodes.indexOf("password") == -1){
				$("#enablepass").hide();
			}else{
				$("#enablepass").show();
				$("#enablemore").hide();
			}
			$("#signinwithldappass").hide();
		}
	}else{
		$("#signinwithldappass").show();
		signinathmode="passwordauth";//no i18N
		prev_showmode = "password";// no i18n
		$("#password").attr("placeholder",I18N.get("IAM.NEW.SIGNIN.PASSWORD"));
		isLdapVisible = false;
		if(btnAllowedModes() == 2){
			$('.blueforgotpassword').show();
			$("#enablepass").hide();
			if(allowedmodes.indexOf("ldap") == -1){
				$("#enableldap").hide();
			}else{
				$("#enableldap").show();
				$("#enablemore").hide();
			}
		}else if(btnAllowedModes() == 1 &&(allowedmodes.indexOf("password") != -1)){
			$('#enableforgot').show();
		};
	}
	showSigninUsingFedOption();
	isFormSubmited = false;
}
function showMoreFedOptions(){
	var idps = deviceauthdetails[deviceauthdetails.resource_name].modes.federated.data;
	var problemsigninheader = "<div class='problemsignin_head'><span class='icon-backarrow backoption problemsigninbackoption'></span><span class='rec_head_text'>"+I18N.get("IAM.NEW.SIGNIN.FEDERATED.LOGIN.TITLE")+"</span></div>";
	var idp_con = "";
	idps.forEach(function(idps){
		if(isValid(idps)){
			idp = idps.idp.toLowerCase();
			idp_con += "<div class='optionstry options_hover optionipds' id='secondary_"+idp+"' value="+idp+">\
							<div class='img_option_try img_option icon-federated'></div>\
							<div class='option_details_try'>\
								<div class='option_title_try'><span style='text-transform: capitalize;'>"+idp+"<span></div>\
								<div class='option_description'>"+formatMessage(I18N.get("IAM.NEW.SIGNIN.IDENTITY.PROVIDER.TITLE"),idp)+"</div>\
							</div>\
							</div>"
        }
	});	
	$('#problemsigninui').html(problemsigninheader +"<div class='problemsignincon'>"+ idp_con+"</div>");
	$('#password_container,#nextbtn,.signin_head,#otp_container,#captcha_container,.fed_2show').hide();
	$('#problemsigninui, #problemsignin_container').show();
	$(".problemsigninbackoption").on("click", function(){
		isPrimaryMode ? showmoresigininoption() : showproblemsignin();
	});
	$(".optionipds").on("click", function(){
		createandSubmitOpenIDForm($(this).attr("value"));
	});
	return false;
}
function enableQRCodeimg(){
	var prefoption = "scanqr"; // no i18n
	var deviceid = deviceauthdetails[deviceauthdetails.resource_name].modes.mzadevice.data[mzadevicepos].device_id;
	var loginurl=uriPrefix+"/signin/v2/"+callmode+"/"+zuid+"/device/"+deviceid+"?";//no i18N
	loginurl += "digest="+digest+ "&" + signinParams; //no i18N
	var jsonData = callmode==="primary" ? {'deviceauth':{'devicepref':prefoption }}: {'devicesecauth':{'devicepref':prefoption }};//no i18N
	sendRequestWithTemptoken(loginurl,JSON.stringify(jsonData),true,handleQRCodeImg);
	signinathmode = callmode==="primary" ?"deviceauth":"devicesecauth";//no i18N
}
function handleQRCodeImg(resp){
	if(IsJsonString(resp)) {
		var jsonStr = JSON.parse(resp);
		signinathmode = jsonStr.resource_name;
		var statusCode = jsonStr.status_code;
		if (!isNaN(statusCode) && statusCode >= 200 && statusCode <= 299) {
			var successCode = jsonStr.code;
			if(successCode === "SI202"||successCode==="MFA302" || successCode==="SI302" || successCode==="SI201"){
				temptoken = jsonStr[signinathmode].token;
				var qrcodeurl = jsonStr[signinathmode].img;
				qrtempId =  jsonStr[signinathmode].temptokenid;
				isValid(qrtempId) ? $("#verify_qr_container #openoneauth").show() : $("#verify_qr_container #openoneauth").hide();
				var wmsid = jsonStr[signinathmode].WmsId && jsonStr[signinathmode].WmsId.toString();
				var wmsaccesstoken = jsonStr[signinathmode].WmsAccessToken && jsonStr[signinathmode].WmsAccessToken.toString();
				isVerifiedFromDevice(prefoption,true,wmsid,wmsaccesstoken);
				$("#verify_qrimg").attr("src",qrcodeurl);//no i18n
				$('.verify_qr .loader,.verify_qr .blur').hide();
			}
		}else{
			if(jsonStr.cause==="throttles_limit_exceeded"){
				showTopErrNotification(jsonStr.localized_message);
				return false;
			}
			var error_resp = jsonStr.errors && jsonStr.errors[0];
			var errorCode = error_resp && error_resp.code;
			if(errorCode === "R303"){ //no i18N
				showRestrictsignin();
				return false;
			}
			showTopErrNotification(jsonStr.localized_message);
			return false;
	   }
		
	}else{
		showTopErrNotification(I18N.get("IAM.ERROR.GENERAL"));
		return false;
	}
	return false;
}
function showPassphraseContainer(){
	signinathmode =  "passphrasesecauth"; //no i18n
	if(typeof sjcl === "undefined" ){
		includeScript(sjclFilePath,showPassphraseContainer,true);
		return false;
	}
	$('#login,.fed_2show,#backupcode_container,#recovery_container,#bcaptcha_container').hide();
	$('#passphrase_container,#backup_container,.backuphead').show();
	$('#backup_title').html("<span class='icon-backarrow backoption passback'></span>"+I18N.get('IAM.NEW.SIGNIN.PASS.PHRASE.TITLE'));
	$(".passback").on("click", function(){
		hideCantAccessDevice();
	});
	$('.backup_desc').html(I18N.get("IAM.NEW.SIGNIN.PASS.PHRASE.DESC"));
	allowedmodes.indexOf("recoverycode") != -1 ? $('#recovery_backup').show() : $('#recovery_backup').hide();
}
function hideSigninOptions(){
	var fedSigninOptionInnerHTML = document.getElementById("fed_signin_options") && document.getElementById("fed_signin_options").innerHTML;
	if(fedSigninOptionInnerHTML != undefined && fedSigninOptionInnerHTML != ""){$(".fed_2show").show()}else{showSigninUsingFedOption()}
	$('#enablemore').show();
	$('#nextbtn,.signin_head').show();
	var show_mode = prev_showmode === "email" ? "otp" : prev_showmode === "ldap"? "password" : prev_showmode; //no i18n
	if(prev_showmode === "password" || prev_showmode === "ldap"){
		signinathmode = prev_showmode === "ldap"? "ldap":"passwordauth"; // no i18N
		$(".resendotp").hide()
	}
	show_mode == "totp" ? $("#mfa_totp_container").show() : $("#"+show_mode+"_container").show(); // no i18n
	$('#problemsigninui, #problemsignin_container').hide();
	return false;
} 
function QrOpenApp() {
	//Have to handle special case!!!
	var qrCodeString = "code="+qrtempId+"&zuid="+zuid+"&url="+iamurl; //No I18N
	document.location= UrlScheme+"://?"+qrCodeString;
	return false;
}
function showRestrictsignin(){
	$('#signin_div,.rightside_box,.banner_newtoold').hide();
	$("#smartsigninbtn").addClass("hide");
	$('#restict_signin').show();
	$(".zoho_logo").addClass('applycenter');
	$('.signin_container').addClass('mod_container');
	return false;
}
function setCookie(x){
	var dt=new Date();
	dt.setDate(dt.getYear() * x);
	var cookieStr = "IAM_TEST_COOKIE=IAM_TEST_COOKIE;expires="+dt.toUTCString()+";path=/;"; //No I18N
	if(cookieDomain != "null"){
		cookieStr += "domain="+cookieDomain; //No I18N
	}
	if (isClientPortal) {
		// Required for iframe / cross-site cases
		cookieStr += ";Secure;SameSite=None;"; //No I18N
	}
	document.cookie = cookieStr;
}
function submitbackup(event){
	if(event.keyCode === 13){
		verifyBackupCode();
	}
}
function setPassword(event){
	if(event.keyCode === 13){
		updatePassword();
	}
}


//Added new timeout param inorder to persist the top notification as per the timeout value.
function showTopNotification(msg, timeout)
{
	$(".alert_message").html(msg);
	$(".Alert").css("top","20px");//No i18N
	if(!($(".topNotificationClose").length)){
		$(".Alert").append($("<span>").addClass("topNotificationClose"));
		$(".topNotificationClose").off().on("click", function(){$(".Alert").css("top","-150px")});
	}
	window.setTimeout(function(){$(".Alert").css("top","-150px")}, timeout ? timeout : 5000);
}

function showTopErrNotification(msg,help,timer)
{
	timer =  timer ? timer : 5000;
	$(".error_message").html(msg);
	$(".Errormsg").css("top","20px");//No i18N
	window.setTimeout(function(){$(".Errormsg").css("top","-150px")},timer);
	if(help != undefined && help != ""){
		$(".error_help").css("display","inline-block");
		$(".error_help").html(help);
		$(".error_message").addClass("error_help_in");
		window.setTimeout(function(){$(".error_message").removeClass("error_help_in");$(".error_help").html("")},5500);
	}
}
function showTopErrNotificationStatic(msg,help,timer)
{
	timer =  timer ? timer : 5000;
	$(".error_message").html(msg);
	$(".Errormsg").css("top","20px");//No i18N
	$('.topErrClose').removeClass("hide");
	$(".error_icon").addClass("err-icon-help");
	if(help != undefined && help != ""){
		$(".error_help").css("display","inline-block");
		$(".error_help").html(help);
		$(".error_message").addClass("error_help_in");
	}
}
function closeTopErrNotification(){
	$(".Errormsg").css("top","-150px");//No i18N
	$("error_message").removeClass("error_help_in");
	$(".error_message").removeClass("error_help_in");
	$(".error_help").css("display","none");
	$(".error_help").html("");
	$(".error_icon").removeClass("err-icon-help");
	if($('.topErrClose').is(":visible")){$('.topErrClose').addClass("hide")}
}
function checkCookie() {
	if(isValid(getCookie(iam_reload_cookie_name))) {
        window.location.reload();
    }
}
function check_pp() {
	ppValidator.validate("","#npassword_container input");//no i18N
}
function remove_error()
{
	$(".field_error").remove();
	clearCommonError("npassword");//no i18N
}
function handleCrossDcLookup(loginID){ 
	$(".blur,.loader").show();
	if(isValid(CC)){ $("#country_code_select").val($("#"+CC).val()) };
	if(isValid(CC)){ loginID = loginID.indexOf("-") != -1 ? loginID :$("#"+CC).val().split("+")[1] + "-" + loginID};
	if(isEmailId(loginID))// to make it lower case 
	{
		loginID=loginID.toLowerCase();
	}
	var loginurl = uriPrefix+"/signin/v2/lookup/"+euc(loginID); //no i18N
	var encryptionJson = {
		path : loginurl,
		value : euc(loginID)
	}
	var params = "mode=primary&" + signinParams; //no i18N
	sendRequestWithCallback(loginurl, params ,true, handleLookupDetails, undefined, encryptionJson, euc(loginID) ,true);
	return false;
}
function handleConnectionError(){
	$("#nextbtn span").removeClass("zeroheight");
	$("#nextbtn").removeClass("changeloadbtn");
	$("#nextbtn").attr("disabled", false);
	isFormSubmited = false;
	showTopErrNotification(I18N.get('IAM.PLEASE.CONNECT.INTERNET'))
	return false;
}

function hideBkCodeRedirection(){
	$(".go_to_bk_code_container").removeClass("show_bk_pop");
	$(".go_to_bk_code_container").hide();
	return false;
}
function showOABackupRedirection(deviceUninstalled){
	if($(".goto_oneauth_fallback_container").hasClass("show_bk_pop") || !$("#mfa_device_container").is(":visible") || isOauPopupClosed){
		return false;
	}
	$(".goto_oneauth_fallback_container").addClass("show_bk_pop");
	$(".goto_oneauth_fallback_container").show()
	var jsonStr = deviceauthdetails[deviceauthdetails.resource_name];
	$(".tryanother").text(I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH.OTHER.OPTION"));
	$(".tryanother").off().on("click", function(){
		showproblemsignin(true);
	})
	if(!deviceUninstalled){//delayed case
		$(".backup_info_header").text(I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH"));
		$(".backup_info_content").html(formatMessage(I18N.get("IAM.NEWSIGNIN.BACKUP.LAST.DEVICE.DESC"),oneAuthLearnmore));
	}else{//uninstalled case
		clearTimeout(oneauthgrant);
		var devicedetails = deviceauthdetails[deviceauthdetails.resource_name].modes;
		var devicename = devicedetails.mzadevice.data && devicedetails.mzadevice.data[parseInt(mzadevicepos)].device_name;
		$(".backup_info_header").text(I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH"));
		$(".backup_info_content").html(formatMessage(I18N.get("IAM.NEWSIGNIN.UNABLE.REACH.ONEAUTH.DESC"),devicename,oneAuthLearnmore));
	}
	if(allowedmodes.length <= 1){
		$(".backup_info_mode").text(I18N.get("IAM.NEW.SIGNIN.CONTACT.SUPPORT"));
		$(".backup_info_mode").on("click", function(){
			showContactSupport();
		});
		$(".tryanother").text(I18N.get("IAM.NEW.SIGNIN.CONTACT.SUPPORT"));
		$(".tryanother").off().on("click", function(){
			showContactSupport();
		});
	}else if(!isPasswordless){
		$(".backup_info_mode").on("click", function(){
			showMoreSigninOptions();
		});
		$(".tryanother").off().on("click", function(){
			showMoreSigninOptions();
		});
		$(".rec_head_text").html("<div class='problemsignin_head'><div class='oa_head_text'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY')+"</div><div class='oa_head_con'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY.DESC')+"</div></div>");
		$("#recovery_container .signin_head").css("margin-bottom","0px");
	}else{
		$(".backup_info_mode").on("click", function(){
			showproblemsignin(true);
		});
	}
	return false;
}
function hideOABackupRedirection(){
	$(".devices").css("pointer","cursor"); 
	$(".goto_oneauth_fallback_container").removeClass("show_bk_pop");
	$(".goto_oneauth_fallback_container").hide();
	return false;
}
function showContactSupport(isBackNeeded,backmethod){
	hideOABackupRedirection();
	showCantAccessDevice();
	$("#recovery_container").show();
	$(".recoveryhead").html("");
	$(".recoveryhead").append($(isBackNeeded ?  "<span class='icon-backarrow backoption' id='contactBack'></span><span class=rec_head_text></span>" : "<span class=rec_head_text></span>"));
	$(".rec_head_text").html(I18N.get("IAM.NEW.SIGNIN.CONTACT.SUPPORT"));
	$(".recoveryhead").append($("<div class='contactSupportDesc'></div>"));
	$(".contactSupportDesc").html(I18N.get("IAM.CONTACT.SUPPORT.DESC"));
	$(".recoveryhead").append($("<div class='mailbox'><table class='mailtable'><tr><td class='icon-email'></td><td class='emailtitle'></td></tr><tr><td></td><td class='emailonly'></td></tr></table></div>"));
	if(!isValid(adminEmail)){
		if(isValid(supportSLA)){
			$(".recoveryhead").append($("<div class='supportSLA'></div>"));
			$(".supportSLA").html(formatMessage(I18N.get("IAM.CONTACT.SUPPORT.SLA"),supportSLA));
		}
//		$(".recoveryhead").parent().append($("<div id='FAQ' class='text16'></div>"))
//		$("#FAQ").html(I18N.get("IAM.CONTACT.SUPPORT.FAQ")).show();
	}
	$(".emailtitle").html(I18N.get("IAM.CONTACT.EMAIL.US.ON"));//no i18n
	$(".emailonly").html(adminEmail ? adminEmail : supportEmailAddress);//no i18n
	$("#recoverymodeContainer,.contactSupport,.contact_support,#alternate_verification_info").hide();
	if(isBackNeeded){
		if(typeof backmethod != 'undefined' && backmethod === "backtoalterinfo"){
			$("#contactBack").on("click", function(){
				backtoalterinfo();
			});
		}else if(typeof backmethod != 'undefined' && backmethod === "backtocaptcha"){//no i18n
			$("#verifycaptcha_container").hide();
			$("#contactBack").on("click", function(){
				backtocaptcha();
			});
		}else{
		if(allowedmodes && allowedmodes.length == 1){
				if(prev_showmode === "otp" || prev_showmode === "totp"){
					$("#contactBack").on("click", function(){
						enableMfaField(prev_showmode);
					});
				}else if(prev_showmode === "mzadevice"){ // No i18n
					$("#contactBack").on("click", function(){
						goBackToProblemSignin()
					});
				}
			}else{
				$("#contactBack").on("click", function(){
					backtoContactSupport();
				});
			}
			if(allowedmodes.length <= 1 && prev_showmode === "mzadevice"){
				$("#contactBack").on("click", function(){
					goBackToProblemSignin();
				});
			}
			if(oaNotInstalled && !isPasswordless){
				$("#contactBack").on("click", function(){
					hidecontactsupport();
				});
			}
		}
	}
}
function backtocaptcha(){
	$("#verifycaptcha_container, #verifycaptcha_container .contactSupport").show()
	$("#recovery_container").hide()
}
function backtoContactSupport(){
	if(!isPrimaryMode){mobposition=undefined}
	showproblemsignin(true,false,true);
	hidecontactsupport();
	if(isPasswordless){
		$(".rec_head_text").html("<div class='problemsignin_head'><div class='oa_head_text'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY')+"</div><div class='oa_head_con'>"+I18N.get('IAM.NEWSIGNIN.USE.ALTER.WAY.DESC')+"</div></div>");
	}
	$(".problemsignin_head .backoption").hide();
}
function hidecontactsupport() {
    isPasswordless = true;
    if(deviceauthdetails[deviceauthdetails.resource_name].isAMFA){
		isPasswordless = false;
		return false;
	}
    if(deviceauthdetails.resource_name == 'passwordauth' ){
    	if(secondarymodes.indexOf('mzadevice') != "-1"){ 
	    	secondarymodes.splice(secondarymodes.indexOf("mzadevice"), 1);
	    	secondarymodes.unshift("mzadevice"); // No I18N
    	}if(allowedmodes.length > 1){
            handlePasswordDetails(JSON.stringify(deviceauthdetails),secondarymodes);
        }else{
        	goBackToProblemSignin();
        }
    }
    $('<div class=backupstep></div>').insertBefore('.rec_head_text');
    $(".backupstep").html(formatMessage(I18N.get("IAM.NEWSIGNIN.BACKUP.STEP"),"2","2"));
    $(".rec_head_text").parent().find(".backupstep").show();
    $("#recoverymodeContainer,.contactSupport").show();
    $(".contactSupportDesc,.mailbox,.supportSLA,#FAQ,#contactSupport").hide(); 
}
function openSmartSignInPage(){
	var smartsigninURL = "/signin?QRLogin=true&"+signinParams;//No I18N
	switchto(smartsigninURL);
}

function enableSplitField(elemID,fieldLength,placeHolder){
	splitField.createElement(elemID,{
		"splitCount": (isMobile) ? 1 : fieldLength,					// No I18N
		"charCountPerSplit" : (isMobile) ? fieldLength : 1 ,		// No I18N
		"isNumeric" : true,				// No I18N
		"otpAutocomplete": true,		// No I18N
		"customClass" : "customOtp",	// No I18N
		"inputPlaceholder":'&#9679;',	// No I18N
		"placeholder":placeHolder,	// No I18N
		"showAsPlaceholders" : (isMobile) ? true : false // No I18N
	});
}
// Multi DC Handling
function handleMultiDCData() {
	  var infoURLs = Object.keys(signin_info_urls).map(function(objKeys){ return signin_info_urls[objKeys]});
	  for (var i = 0; i < infoURLs.length; i++) { 
		  if(infoURLs.length-1 == i){
			  includeScript(infoURLs[i]+signin_info_uri+"?callback=printUser&dc="+current_dc,callbackforfailure,true);
			  return false;
		  }
		  includeScript(infoURLs[i]+signin_info_uri+"?callback=printUser&dc="+current_dc);
	  }
	  return false;
}
function callbackforfailure(){
	if(!$('#ip_desc').is(":visible")){
		fediconsChecking();
	}
	hideloader();
	return false;
}
function initiateLogin(signinurl,login_id){
	var oldForm = document.getElementById("multiDCredirection");
	if(oldForm) {
		document.documentElement.removeChild(oldForm);
	}
		var form = document.createElement("form");
		form.setAttribute("id", "multiDCredirection");
		form.setAttribute("method", "POST");
	    form.setAttribute("action", signinurl+multidc_origin_uri+"?state="+state_param);
	    form.setAttribute("target", "_parent");
	    
	    var hiddenField = document.createElement("input");
		hiddenField.setAttribute("type", "hidden");
		hiddenField.setAttribute("name", "LOGIN_ID");
		hiddenField.setAttribute("value", login_id ); 
		form.appendChild(hiddenField);
		
		var params=getQueryParams(signinParams);
		for(var key in params) {
			if(isValid(params[key])) {
				hiddenField = document.createElement("input");
				hiddenField.setAttribute("type", "hidden");
				hiddenField.setAttribute("name", key);
				hiddenField.setAttribute("value", params[key]);
				form.appendChild(hiddenField);
			}
		}
		document.documentElement.appendChild(form);
	  	form.submit();
	  	return false;
	
}
function goToUserLogin(){
	$('.fieldcontainer,#nextbtn,#forgotpassword,.line,.fed_2show,#signuplink').show();
	$('#multiDC_container,#createaccount').hide();
	fediconsChecking();
	$('.signin_head').css('margin-bottom','30px');
	return false;
}
function loadTooltipPosition(){
	var element = document.getElementsByClassName('multiDC_info')[0];
	var rect = element.getBoundingClientRect();
	var topposition = rect.top;
	var leftpostion = rect.left;
	$(".up-arrow").css("top",topposition+"px"); // no i18n
	$(".up-arrow").css("left",leftpostion+"px"); // no i18n
	return false;
}
function printUser(respData){
	var user_count = 0;
	var elem = "";
	if(IsJsonString(respData)) {
		respData = JSON.parse(respData);
	} 
	if(Object.keys(respData).length <= 0){
		return false;
	}
	elem += '<div class="profile_head initiateLogin" info-url='+signin_info_urls[respData.DC_INFO]+' display-id='+respData.DISPLAY_ID+'>\
								<div class="profile_dp" id="profile_img">\
								<span class="file_lab">\
									<img id="dp_pic" draggable="false" style="width: 100%; height: 100%;">\
								</span>\
							</div>\
							<div class="profile_info">\
								<div class="profile_name" id="profile_name">'+decodeHexString(respData.DISPLAY_NAME)+'</div>\
								<div class="profile_email" id="profile_email">'+respData.DISPLAY_ID+'</div>\
							</div>\
							<div class="DC_info"><span class="icon-datacenter"></span><span>'+respData.DC_INFO.toUpperCase()+'</span></div>\
						</div>';
	user_count++; 
	var tooltip_elem = "<div class='dcInfoCon'><span class='DC_info DC_info-more'><span class='icon-datacenter'></span>"+respData.DC_INFO.toUpperCase()+"</span>\
						<span class='DC_name-details'>"+respData.DC_INFO.toUpperCase()+" "+I18N.get("IAM.FEDERATED.SIGNUP.CREATE.DATA.CENTER.TITLE")+"</span></div>";
	if(user_count > 0){
		$("#account_details").html($("#account_details").html()+ elem);
		multiDCTriggered++;
		$(".DC-details").html($(".DC-details").html()+ tooltip_elem);
		$(".DC-details #dp_pic").attr("src",respData.LOGO_URL);
		$(".DC-details #dp_pic").on("error",function(){this.src = "/v2/components/images/user_2.png";});
	    $('.fieldcontainer,#nextbtn,#forgotpassword,.line,.fed_2show,#signuplink').hide();
		$('#multiDC_container,#multiDC_container .line,#createaccount').show();
		$('.signin_head').css('margin-bottom','24px');
		setFooterPosition();
		$(".initiateLogin").on("click",function(){
			initiateLogin($(this).attr("info-url"),$(this).attr("display-id"));
		})
		loadTooltipPosition();
	}
	return false;
}
function hideloader(){
	$(".signin_container").css("visibility","visible");
	if(!isClientPortal){
		if($(".load-bg").is(":visible")){
			setTimeout(function(){
				document.querySelector(".load-bg").classList.add("load-fade"); //No I18N
				setTimeout(function(){
					document.querySelector(".load-bg").style.display = "none";if(!isMobile){$('#login_id').focus()};
				}, 50)
			}, 100);
		}
	} 
	setFooterPosition();
	return false;
}


function isValidCode(code) {
	code = (code ||"").trim();
	if(code.length != 0){
		var codePattern = new RegExp("^([0-9]{"+otp_length+"})$");
		if(codePattern.test(code)){
			return true;
		} 
	} 
	return false;
}
function decodeHexString(str) {
    str = str.replace(/\\x([0-9A-Fa-f]{2})/g, function () {
        return String.fromCharCode(parseInt(arguments[1], 16));
    });
    str = str.replace(/\\u([\d\w]{4})/gi, function () {
        return String.fromCharCode(parseInt(arguments[1], 16));
    });
    return str;
}
function verifyCaptcha(frm){
	if (frm.event && typeof frm.event.preventDefault === 'function') {	//no i18n
		frm.event.preventDefault();
    }else if(window.event != undefined && typeof window.event.preventDefault === 'function'){	//no i18n
		window.event.preventDefault();
	}
	var captchavalue = frm.verifycaptcha && frm.verifycaptcha.value.trim();
	if(!isValid(captchavalue)) {
		showCommonError("verifycaptcha",I18N.get("IAM.SIGNIN.ERROR.CAPTCHA.REQUIRED"),true);//no i18n
		return false;
	}
	if( !(/^[a-zA-Z0-9]*$/.test( captchavalue )) ) {
		showCommonError("verifycaptcha",I18N.get("IAM.SIGNIN.ERROR.CAPTCHA.INVALID"),true);//no i18n
		return false;
	}
	isPasswordless ? showAndGenerateOtp("otp",captchavalue) : generateOTP(false,"otp",captchavalue); // no i18n
	return false;
}
function showCaptchaContainer(jsonStr){
	var errorMessage = jsonStr.localized_message;
	cdigest=jsonStr.cdigest;
	showHip(cdigest,"verifycaptcha_img","verifycaptcha");//no i18n
	$("#verifycaptcha").attr("tabindex", 1);
	$("#captcha").attr("tabindex", 2);
	$("#nextbtn").attr("tabindex", 3)
	if( jsonStr.errorCode === "IN107"){
		showCommonError("verifycaptcha",errorMessage); //no i18n	
	}
	$("#login,.fed_2show,#signuplink").hide();
	$("#verifycaptcha_container,#verifycaptcha_container #backup_title,.verifycaptcha_desc,.verifycaptcha_head,#verifycaptcha_container .contactSupport").show();
	var captchaTitle = isPasswordless ? "IAM.NEW.SIGNIN.SMS.HEADER.CAPTCHA.VERIFY.ONEAUTH" : "IAM.NEW.SIGNIN.SMS.HEADER.CAPTCHA.VERIFY"; // no i18n
	var captchaDesc = isPasswordless ? "IAM.NEW.SIGNIN.SMS.DESC.CAPTCHA.VERIFY.ONEAUTH" : "IAM.NEW.SIGNIN.SMS.DESC.CAPTCHA.VERIFY"; // no i18n
	$('#verifycaptcha_container #backup_title').html("<span class='icon-backarrow backoption verifycaptchabackop'></span><span>"+I18N.get(captchaTitle))+"</span>";
	$(".verifycaptchabackop").on("click", function(){
		hideCaptchaContainer();
	});
	$('#verifycaptcha_container #verifycaptcha_desc').html(formatMessage(I18N.get(captchaDesc),rmobile));
	if((allowedmodes.length == 1) || !isPrimaryMode){
		$(".backoption").hide();
	}
	return false;
}
function hideCaptchaContainer(){
	$("#verifycaptcha_container").hide();
	$("#login").show();
	signinathmode === "lookup" ? $(".fed_2show,#signuplink").show() : "" ; // no i18n
	return false;
}
function handleOpenRedirection(pageLoadRedirectionData,redirectionMode) {
    var openRedirectNowBtn = $("#openRedirectNowBtn");
    var openBackToHomeBtn = $("#openBackToHomeBtn");
    var data = IsJsonString(pageLoadRedirectionData) ? JSON.parse(pageLoadRedirectionData) : pageLoadRedirectionData;
    var isSimpleRedirect = typeof data.allowed_modes === "undefined";//no i18n
    var orgName = data.org_name || (deviceauthdetails[deviceauthdetails.resource_name] && deviceauthdetails[deviceauthdetails.resource_name].org_name) || "";
    var domain = data.domain || data[data.allowed_modes[0]].data[0].domain || "";
    var display_name = data.display_name || data[data.allowed_modes[0]].data[0].display_name || "";
    redirectionMode = typeof redirectionMode !== "undefined" ? redirectionMode : data.idp_mode || data.allowed_modes[0] || "";//no i18n
    $("#or_domain").html(domain);
    $("#or_org_title").html(orgName);
    $("#openRedirectNowBtn").html(formatMessage(I18N.get("IAM.SIGNIN.WITH.SSO"),redirectionMode.toUpperCase()))
    if (isSimpleRedirect) {
        openRedirectNowBtn.off('click').on("click", function() {
            switchto(data.redirect_uri);
        });
        openBackToHomeBtn.off('click').on("click", function() {
            switchto("/");
        });
    } else {
        var lookupModes = data || (deviceauthdetails[deviceauthdetails.resource_name] && deviceauthdetails[deviceauthdetails.resource_name].modes) || {};
        var modeEvents = {
            "saml": { fn: redirectToSaml, arg: lookupModes.saml && lookupModes.saml.data[0] },
            "jwt": { fn: switchto, arg: lookupModes.jwt && lookupModes.jwt.data[0] && lookupModes.jwt.data[0].redirect_uri },
            "oidc": { fn: enableOIDCAuth, arg: lookupModes.oidc && lookupModes.oidc.data[0] && lookupModes.oidc.data[0].oidc_id }
        };
        openRedirectNowBtn.off('click').on("click", function() {
            var event = modeEvents[redirectionMode];
            if (event && typeof event.fn === "function") {
                event.fn(event.arg);
            }
        });
        openBackToHomeBtn.off('click').on("click", function() {
            resetForm();
        });
    }
    signinathmode = "openredirection"; // no i18n
    $("#open_redirection_desc").html(formatMessage(I18N.get("IAM.OPEN.REDIRECTION.DESC.NEW"),display_name));
    $(".fed_2show,.banner_newtoold,#signuplink,#forgotpassword,#login").hide();
    $("#smartsigninbtn").addClass("hide");
    $(".open_redirection_container").show();
}
function hideCountryCode() {
    $(".MobflagContainer, .select_container--country_implement, .select_country_code, #country_code_select, .select2").hide();
    $("#login_id").removeClass("textindent62 textindent70");
    removeUVindent();
    hiddenCountrycode = true;
    uvselect.isDropdownOpen("country_code_select") && uvselect.destroySelectDropdown("country_code_select");// no i18n
}
function showCountryCode() {
    try {
		$(".select_container--country_implement").show();
		checkTestIndent();
		$(".selection").addClass("showcountry_code");
        $(isMobile && !rendermovileUV ? ".MobflagContainer, .select_country_code, #country_code_select" : ".select2").show();
    } catch (err) {
        $(".select_country_code, #country_code_select").css("display", "block");
    }
    $("#login_id").addClass(hideUVFlag ? "textindent70" : "textindent62");
    hiddenCountrycode = false;
    $(".showCountryCode").slideUp(100);
    numericEditCounts = 0;
}

function showRegionSelectScreen(regionData,isExtUserVerified){
    $("#signin_div, #signuplink").hide();
    $("#smartsigninbtn").addClass("hide");
	$("#regionalAccountSection_title").text(I18N.get(regionData.length > 1 ? "IAM.CLONED.ACCOUNTS" : "IAM.REGIONAL.ACCOUNT"));
	$("#regionSelect_desc").text(I18N.get(regionData.length > 1 ? "IAM.SIGNIN.REGION.SELECT.DESC.MULTIPLE" : "IAM.SIGNIN.REGION.SELECT.DESC"));
    $('.username').text(identifyEmailOrNum());// no i18n
    var regionalAccountlist = $("#regionalAccountsList").empty();
    regionData.forEach(function (item, idx) {
        $("<div>").attr("id", "regionalAccount+" + idx).addClass("regionalAccount-box").attr("dcvalue", item.dc).append($("<span>").addClass("accountRegion_text").text(item.dc_desc)).append($("<span>").addClass("accountRegion_arrow icon-backarrow")).appendTo(regionalAccountlist);// no i18n
    });
	$("#parentAccount_region").text(deviceauthdetails.lookup.parent_dc_desc);
	$("#parentAccount_container, #regionalAccountsList .regionalAccount-box").off("click").on("click", function () {
		!$(this).is("#parentAccount_container") && (signinParams = "dc="+$(this).attr("dcvalue")+"&"+signinParams, selectedRegionalDC = $(this).attr("dcvalue")); // no i18n
		$("#regionSelect_container").hide();
		$("#signin_div, #signuplink").show();
		$("#smartsigninbtn").removeClass("hide");
		handleLookupDetails(JSON.stringify(deviceauthdetails), isExtUserVerified, false, true);
	});
    $("#regionSelect_container").show();
}
function highlightElementWithScale(elementId) {
	$('.qrOverlay').remove();
	var $target = $(elementId);
	if ($target.length === 0) {return false}
	
	var $overlay = $('<div id="qrOverlay" class="qrOverlay" style="position: fixed;top: 0;left: 0;width: 100vw;height: 100vh;transition: 0.3s;z-index: 9998"></div>');
	
	$(elementId).before($overlay);
	setTimeout(function() {
		$overlay.css({
			'background': 'rgba(0, 0, 0, 0.3)'// no i18n
		});
	}, 100);
	$target.css({
		'position': 'relative','z-index': 9999,'transition': 'transform 0.3s ease','transform': 'scale(2)'// no i18n
	});
	$(".qrOverlay,.expandQrLabel").off("click").on('click', function () {
		$target.css({
			'transform': 'scale(1)', 'z-index': 'auto'// no i18n
		});
		$overlay.css({
			'background': 'rgba(0, 0, 0, 0)'// no i18n
		});
		setTimeout(function() {
			$('.qrOverlay').remove();
		}, 300);
		$(".expandQrLableIcon").toggleClass('icon-Expand icon-Collapse');
		$(".expandQrLabel").off("click").on("click",function(){
			$(".expandQrLableIcon").toggleClass('icon-Expand icon-Collapse');
			highlightElementWithScale(".qrcodecontainer");//no i18n
		})
	});
}