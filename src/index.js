import defaultSettings from "./settings";
export default class Analytics {
    _formSubmitted = false;
    _mainPhone = null;

    constructor(settings) {
        if (!!Analytics.instance) {
            return Analytics.instance;
        }

        this.settings = Object.assign(defaultSettings, settings);

        Analytics.instance = this;

        return this;
    }

    _ensureErrorPopupDiv(popupSelector) {
        let errorPopup = document.querySelector(popupSelector);

        if (!errorPopup) {
            errorPopup = document.createElement('div');
            errorPopup.id = "tilda-popup-for-error";
            errorPopup.className = "js-form-popup-errorbox tn-form__errorbox-popup";
            errorPopup.style.display = "none";

            let errorSubPopup = document.createElement("div");
            errorSubPopup.className = "t-form__errorbox-text t-text t-text_xs";
            errorSubPopup.style.display = "block";
            errorPopup.appendChild(errorSubPopup);

            document.body.appendChild(errorPopup);
            return errorSubPopup;
        }

        return errorPopup.querySelector(".t-form__errorbox-text.t-text.t-text_xs");
    }

    _showErrorMessage(type = "custom", animationTimeout = 5000) {
        let errorMessageContainer = this._ensureErrorPopupDiv(this.settings.popupSelector);
        if (!errorMessageContainer) {
            console.warn("container '.t-form__errorbox-text.t-text.t-text_xs' not found.");
            return;
        }

        let errorText = this.settings.errorMap[type].message[this.settings.language];

        let parentElement = errorMessageContainer.parentElement;
        errorMessageContainer.style.display = "block";
        parentElement.style.display = "block";

        let errorMessage = errorMessageContainer.querySelector('p');
        if (errorMessage) {
            errorMessage.style.display = "block";
        } else {
            errorMessage = document.createElement('p');
            errorMessage.id = "emEmail";
            errorMessage.className = "t-form__errorbox-item";
            errorMessage.style.display = "block";
            console.log("Error message created; type: " + type);
            errorMessageContainer.appendChild(errorMessage);
        }

        errorMessage.textContent = errorText;

        setTimeout(() => {
            errorMessage.style.display = "none";
            errorMessageContainer.style.display = "none";
            parentElement.style.display = "none";
        }, animationTimeout);

        console.warn(errorText);
    }

    _getAllCookies() {
        try {
            const cookiesObj = {};
            if (!document.cookie) return cookiesObj;

            const cookiePairs = document.cookie.split("; ");
            for (const pair of cookiePairs) {
                const [name, value = ""] = pair.split("=");
                cookiesObj[name] = decodeURIComponent(value);
            }
            return cookiesObj;
        } catch {
            console.error("Error occured: ", error);
            return {};
        }

    }

    _attachLastNameListener(form) {
        const lastNameField = form.querySelector('[name="email"]');

        lastNameField.addEventListener('change', async () => {
            this._getMarketingData();
            let gaClientId = '';
            let cookiesObj = this._getAllCookies();

            if (cookiesObj['_ga']) {
                gaClientId = cookiesObj['_ga']
            }

            let inputs1 = document.querySelectorAll("input[name='ga_client_id']");
            for (const input1 of inputs1) {
                input1.value = gaClientId;
            }

            let inputs2 = document.querySelectorAll("input[name='first_source']");
            for (const input2 of inputs2) {
                input2.value = localStorage.getItem('first_source');
            }

            let inputs3 = document.querySelectorAll("input[name='first_landing_page']");
            for (const input3 of inputs3) {
                input3.value = localStorage.getItem('first_landing_page');
            }

            let inputs4 = document.querySelectorAll("input[name='first_medium']");
            for (const input4 of inputs4) {
                input4.value = localStorage.getItem('first_medium');
            }

            let inputs5 = document.querySelectorAll("input[name='session_source_medium']");
            for (const input5 of inputs5) {
                input5.value = localStorage.getItem('session_source_medium');
            }

            try {
                if (form.getAttribute("analyticsTriggered") == "false") {
                    const response = await fetch(`${this.settings.apiUrl}/visitor/analytics`);
                    if (!response.ok) {
                        throw new Error(`Network response was not ok (status ${response.status})`);
                    }
                    const data = await response.json();
                    console.log("Analytics recieved;");
                    // console.log(data);

                    let inputs1 = document.querySelectorAll("input[name='Client_Ip']");
                    for (const input1 of inputs1) {
                        input1.value = data.clientIp;
                    }

                    let inputs2 = document.querySelectorAll("input[name='User_Agent']");
                    for (const input2 of inputs2) {
                        input2.value = data.userAgent;
                    }

                    let inputs3 = document.querySelectorAll("input[name='Accept Language']");
                    for (const input3 of inputs3) {
                        input3.value = data.acceptLanguage;
                    }

                    let inputs4 = document.querySelectorAll("input[name='Ip Region']");
                    for (const input4 of inputs4) {
                        input4.value = data.ipRegion;
                    }

                    let inputs5 = document.querySelectorAll("input[name='Ip Country']");
                    for (const input5 of inputs5) {
                        input5.value = data.ipCountry;
                    }

                    let inputs6 = document.querySelectorAll("input[name='Ip City']");
                    for (const input6 of inputs6) {
                        input6.value = data.ipCity;
                    }

                    let inputs7 = document.querySelectorAll(`input[type="hidden"][name="Cookies"]`);
                    for (const input7 of inputs7) {
                        input7.value = JSON.stringify(this._getAllCookies());
                    }

                    form.setAttribute("analyticsTriggered", "true");
                }
            } catch (err) {
                console.error('Fetch error:', err);
            }
        });
    }

    _phoneTracker(event) {
        console.log('Event in phoneHelper triggered;');
        const pInput = event.target;
        const pValue = pInput.value;

        const phoneEvent = new Event("phoneChange");
        window.dispatchEvent(phoneEvent);

        // console.log(pValue);

        if (pValue.charAt(1) === "0" && pInput.getAttribute("data-phonemask-iso") === "de") {
            let rawValue = pValue.replace("(", "").replace(")", "").replace(" ", "").replace("-", "");
            while (rawValue.charAt(0) === "0") {
                rawValue = rawValue.slice(1);
            }

            let newPhoneValue = "("
            for (let i = 0; i <= rawValue.length; i++) {
                newPhoneValue += rawValue.charAt(i);

                if (i === 2) {
                    newPhoneValue += ") ";
                }

                if (i === 6) {
                    newPhoneValue += "-";
                }

                console.log("newPhoneValue: ", newPhoneValue, i);
            }

            pInput.value = newPhoneValue;
            pInput.innerHTML = newPhoneValue;
            pInput.textContent = newPhoneValue;
        }
    }

    async _phoneValidation(form) {
        try {
            console.log("phoneValidation is triggered;");
            const phoneMask = form.querySelector(".t-input-phonemask__select-flag").getAttribute("data-phonemask-flag").trim();
            const phoneCode = form.querySelector(".t-input-phonemask__select-code").textContent.trim();
            const phoneNumber = (phoneCode + form.querySelector('[name="tildaspec-phone-part[]"]').getAttribute("data-phonemask-current").trim()).replace("(", "").replace(")", "").replace(" ", "").replace("-", "");

            const requestData = {
                phone: phoneNumber,
                countryCodeIso: phoneMask
            };

            const response = await fetch(`${this.settings.apiUrl}/phone/validate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });

            console.log(response.body);

            if (response.status === 200) {
                const responseBody = await response.json();
                console.log("PhoneResponseBody: ", responseBody);

                if (responseBody.phoneType !== "INVALID") {
                    return true;
                } else {
                    this._showErrorMessage("phone_invalid");
                    return false;
                }
            }


        } catch (error) {
            console.error("Phone validation or request failed:", error);
            return true;
        }
    }

    _startButtonAnimation(form) {
        try {
            form.setAttribute("animation", "true");
            console.log("Animation started;");

            let subButton = form.querySelector("button[type='submit']");
            const originalText = subButton.textContent;
            const frames = [
                ".",
                ". .",
                ". . ."
            ];
            let currentFrame = 0;

            const intervalId = setInterval(() => {
                if (form.getAttribute("animation") !== "true") {
                    clearInterval(intervalId);
                    subButton.textContent = originalText;
                    return;
                }

                console.log("Current text: ", subButton.textContent);

                subButton.textContent = frames[currentFrame];
                currentFrame = (currentFrame + 1) % frames.length;
            }, 400);
        } catch (error) {
            console.error("Error occured: ", error);
        }
    }

    _stopButtonAnimation(form) {
        form.setAttribute("animation", "false");
        console.log("Validation is not busy;");
    }

    _fuTilda(form) {
        try {
            form.querySelector("input[name='Privacy Agreement']").required = true;
        } catch (error) {
            console.error(error);
        }
    }

    _changeResultText() {
        let phone = this._mainPhone;

        if (phone == null){
            console.warn("Phone Number was not found;");
        }

        console.log("changeResultText was called;");
        let popup = document.getElementById("tildaformsuccesspopuptext");
        if (popup && popup != null) {
            let link = popup.querySelector(`a[href="${this.settings.tgBaseLink}"]`);
            if (link && link != null){
                link.href = this.settings.tgPulseLink+phone;
            }
            // popup.innerHTML = "<p>Спасибо за регистрацию! Пожалуйста, запустите Telegram-бота, чтобы подключиться к вебинару. Ссылка на подключение будет доступна только там</p><a style='color:#93b0ff;font-style: italic;text-decoration: none;cursor: pointer;' href='https://tg.pulse.is/DWWBuddyBot?start=6877a2d25791f9aa6800a3fe|phone_number="+phone+"'>START</a>";
            popup.id = "tildaformsuccesspopuptextOLD";
        } else {
            console.warn("PopUp not found;");
        }
    }

    _phoneUpdater(){
        let pagePhones = document.querySelectorAll("input[name='Телефон']");
        for (const pagePhone of pagePhones){
            let pValue = pagePhone.value;
            if(pValue && pValue != null){
                this._mainPhone = "+" + pValue.replace(/\D/g, '');
            }
        }
    }

    _getMarketingData() {
        let medium = this._getMedium();
        let source = this._getSource();

        localStorage.setItem('session_source_medium', source + ' / ' + medium);
        if (!document.cookie.split('; ').find(row => row.startsWith("isMarketingDataCollected" + '='))) {
            document.cookie = 'isMarketingDataCollected=true';

            localStorage.setItem('first_medium', this._getMedium());
            localStorage.setItem('first_source', this._getSource());
            localStorage.setItem('first_landing_page', window.location.href);
        }
    }

    _getMedium() {
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = document.referrer;
        let medium = 'direct';

        if (urlParams.has('utm_medium')) {
            medium = urlParams.get('utm_medium');
        } else if (referrer) {
            const refHost = new URL(referrer).hostname;

            const searchEngines = ['google', 'yandex', 'bing', 'duckduckgo', 'yahoo'];
            const isSearch = searchEngines.some(engine => refHost.includes(engine));

            if (isSearch) {
                medium = 'organic';
            } else {
                medium = 'referral';
            }
        }

        return medium;
    }

    _getSource() {
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = document.referrer;

        if (urlParams.has('utm_source')) return urlParams.get('utm_source');
        if (referrer) return new URL(referrer).hostname;
        return 'direct';
    }

    changeResultHelper(){
        window.addEventListener("phoneChange" , () =>{
            this._phoneUpdater();
        });

        const intervalId = setInterval(() => {
            const popup = document.querySelector('#tildaformsuccesspopuptext');
            if (popup) {
                console.log("PopUp found;");
                this._changeResultText();
                clearInterval(intervalId);
            }
        }, 100);

        const popupLinks = document.querySelectorAll(`a[href="${this.settings.tgBaseLink}"]`);
        for (const link of popupLinks){
            link.name = "cursedLink";
        }

        const intervalLink = setInterval(() => {
            const popupLinks = document.querySelectorAll('a[name="cursedLink"]');

            for (const link of popupLinks){
                // console.log("Cursed PopUp found;");
                let phoneLink = this._mainPhone;
                link.href = this.settings.tgPulseLink+phoneLink;
            }
        }, 300);
    }

    phoneHelper() {
        const phones = document.querySelectorAll('input[name="tildaspec-phone-part[]"]');
        console.log('phoneHelper triggered;');

        phones.forEach((phone) => {
            phone.addEventListener('input', this._phoneTracker);
            phone.addEventListener('paste', this._phoneTracker);
        });
    }

    getForms() {
        try {
            let initForms = document.querySelectorAll('form');
            const resForms = [];

            for (const form of initForms) {
                const flag = (form.querySelector('input[name="email"]') !== null) && (form.querySelector('input[name="tildaspec-phone-part[]"]') !== null);

                if (flag) {
                    resForms.push(form);
                }
            }

            console.log("Forms on the webpage: ", resForms.length);
            return resForms;

        } catch (e) {
            console.log("Error at getForms: ", e);
            return [];
        }
    }

    lastNameHelper(forms) {
        for (let form of forms) {
            this._attachLastNameListener(form);
            form.setAttribute("analyticsTriggered", "false");
        }
    }

    subValidation(forms) {
        try {
            console.log("subValidation was called;");
            for (const form of forms) {
                this._fuTilda(form);
                let subButton = form.querySelector("button[type='submit']");

                let countryCode = form.querySelector("span[class='t-input-phonemask__select-code']");
                let prevValue = countryCode.textContent.trim();

                let myObserver = new MutationObserver(function () {
                    const countryCodeNew = form.querySelector("span[class='t-input-phonemask__select-code']");
                    let curValue = countryCodeNew.textContent.trim();

                    if (curValue != prevValue) {
                        console.log("countryCode change was detected;");
                        let phoneField = form.querySelector('input[name="tildaspec-phone-part[]"]');
                        phoneField.value = "";
                        phoneField.innerHTML = "";
                        phoneField.textContent = "";

                        phoneField.setAttribute("data-phonemask-current", "");
                        prevValue = curValue;
                    }
                })

                myObserver.observe(countryCode, { childList: true, characterData: true, subtree: true });

                let subButtonContainer = subButton.parentElement;
                subButtonContainer.style.cursor = "pointer";

                subButton.setAttribute('inert', "disabled");
                form.setAttribute("animation", "false");

                subButtonContainer.addEventListener("click", async () => {
                    if (form.getAttribute("animation") == "false") {
                        const firstName = form.querySelector('input[name="name"]').value;
                        const lastName = form.querySelector('input[name="last name"]').value;

                        console.log(firstName,lastName);

                        if (!firstName || !lastName) {
                            this._showErrorMessage("name_surname_missing");
                            console.warn("Name or surname is missing!");
                            this._stopButtonAnimation(form);
                            console.log("stopButtonAnimation was called;");
                            return false;
                        }

                        const email = form.querySelector('input[name="email"]').value.trim();
                        if (!email) {
                            this._showErrorMessage("email_missing");
                            console.warn("Email is missing!");
                            this._stopButtonAnimation(form);
                            console.log("stopButtonAnimation was called;");
                            return false;
                        }

                        const emailField = form.querySelector('input[name="email"]');
                        if (!emailField.checkValidity()) {
                            console.warn("Email is invalid!");
                            this._showErrorMessage("email_invalid");
                            this._stopButtonAnimation(form);
                            console.log("stopButtonAnimation was called;");
                            return false;
                        }

                        const phone = form.querySelector("input[name='tildaspec-phone-part[]']").getAttribute("data-phonemask-current");
                        if (!phone) {
                            console.warn("Phone Number is missing!");
                            this._showErrorMessage("phone_missing");
                            this._stopButtonAnimation(form);
                            console.log("stopButtonAnimation was called;");
                            return false;
                        }

                        if (!form.checkValidity()) {
                            form.reportValidity();
                            this._showErrorMessage("required_fields_missing");
                            this._stopButtonAnimation(form);
                            console.log("stopButtonAnimation was called;");
                            return false;
                        }

                        this._startButtonAnimation(form);
                        let validationResult = await this._phoneValidation(form);


                        console.log("Validation: ", validationResult);
                        if (validationResult && !this._formSubmitted) {
                            subButton.setAttribute('inert', "enabled");
                            // subButton.click();
                            this._formSubmitted = true;
                            form.requestSubmit(form.querySelector("button[type='submit']"));
                            subButton.setAttribute('inert', "disabled");
                            setTimeout(() => {
                                this._formSubmitted = false;
                            }, 2000);
                        } else {
                            this._showErrorMessage("phone_invalid");
                        }
                        this._stopButtonAnimation(form);
                        console.log("stopButtonAnimation was called;");
                    }

                    console.log("stopButtonAnimation was called;");
                    this._stopButtonAnimation(form);
                })
            }
        } catch (error) {
            console.error("Submition validation failed: ", error);

            const forms = this.getForms();
            for (const form of forms) {
                let subButton = form.querySelector("button[type='submit']");
                subButton.setAttribute('inert', "enabled");
                form.requestSubmit(form.querySelector("button[type='submit']"));
                console.log("stopButtonAnimation was called;");
                this._stopButtonAnimation(form);

            }
        }
    }

    init() {
        const forms = this.getForms();
        this.lastNameHelper(forms);
        this.subValidation(forms);
        this.phoneHelper();
        this.changeResultHelper();
    }
}
