import defaultSettings from "./settings";
export default class Analytics {
    _formSubmitted = false;
    _mainPhone = null;
    _mainEmail = null;

    constructor(customSettings, language = 'RU') {
        if (!!Analytics.instance) {
            return Analytics.instance;
        }

        this.language = language;
        this.settings = Object.assign(defaultSettings, customSettings);
        this.forms = this.getForms();
        this.tgLinks = document.querySelectorAll(`a[href="${this.settings.tgBaseLink}"]`);
        Analytics.instance = this;

        return this;
    }

    getHiddenField(name) {
        return this.settings.hiddenFields[name];
    }

    setHiddenField(name, type = "text", value = "") {
        this.settings.hiddenFields[name] = {value, type};
    }

    removeHiddenField(name) {
        delete this.settings.hiddenFields[name];
    }

    _constructSendPulseLink (pulseValues = this.settings.tgPulseValues, urlBase = "https://tg.pulse.is/", botName = this.settings.tgBotName, pulseStart = this.settings.tgSendPulseStart) {
        let link = urlBase + botName + "?start=" + pulseStart;

        Object.entries(pulseValues).forEach(([key, value]) => {
            link += `|${key}=${value}`;
        });

        return link;
    }

    insertHiddenFieldsInForms(hiddenFields) {
        const forms = this.forms;
        const fields = Object.entries(hiddenFields);
        forms.forEach(form => {
            fields.forEach(field => {
                const inputHTML = `<input type="${field[1].type}" id="${field[0]}" name="${field[0]}" value="${field[1].value}" style="display: none" />`;
                form.insertAdjacentHTML('beforeend', inputHTML);
            });
        })
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

        let errorText = this.settings.errorMap[type].message[this.language];

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

    _inputInHiddenField(fieldName, fieldValue) {
        let fields = document.querySelectorAll(`input[name='${fieldName}']`);
        for (const field of fields) {
            field.value = fieldValue;
        }
    }

    // Подумать, на какое событие тоже лучше было бы повесить этот метод
    _attachLastNameListener(form) {
        const lastNameField = form.querySelector('[name="email"]');

        lastNameField.addEventListener('change', async () => {
            try {
                this._getMarketingData();
                let gaClientId = '';
                let cookiesObj = this._getAllCookies();

                if (cookiesObj['_ga']) {
                    gaClientId = cookiesObj['_ga']
                }

                this._inputInHiddenField("ga_client_id", gaClientId);
                this._inputInHiddenField("first_source", localStorage.getItem('first_source'));
                this._inputInHiddenField("first_landing_page", localStorage.getItem('first_landing_page'));
                this._inputInHiddenField("first_medium", localStorage.getItem('first_medium'));
                this._inputInHiddenField("session_source_medium", localStorage.getItem('session_source_medium'));
                if (form.getAttribute("analyticsTriggered") == "false") {
                    const response = await fetch(`${this.settings.apiUrl}/visitor/analytics`);
                    if (!response.ok) {
                        throw new Error(`Network response was not ok (status ${response.status})`);
                    }
                    const data = await response.json();
                    console.log("Analytics recieved;");
                    // console.log(data);

                    this._inputInHiddenField("Client_Ip", data.clientIp);
                    this._inputInHiddenField("User_Agent", data.userAgent);
                    this._inputInHiddenField("Accept Language", data.acceptLanguage);
                    this._inputInHiddenField("Ip Region", data.ipRegion);
                    this._inputInHiddenField("Ip Country", data.ipCountry);
                    this._inputInHiddenField("Ip City", data.ipCity);
                    this._inputInHiddenField("Cookies", JSON.stringify(this._getAllCookies()));

                    form.setAttribute("analyticsTriggered", "true");
                }
            } catch (err) {
                console.error('Fetch error:', err);
            }
        });
    }

    // рефактор под две CMS
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

    // рефактор под две CMS
    async _phoneValidation(form) {
        try {
            console.log("phoneValidation is triggered;");
            const phoneMask = form.querySelector(".t-input-phonemask__select-flag").getAttribute("data-phonemask-flag").trim();
            const phoneCode = form.querySelector(".t-input-phonemask__select-code").textContent.trim();
            const phoneNumber = (phoneCode + form.querySelector('[name="tildaspec-phone-part[]"]').getAttribute("data-phonemask-current").trim()).replace("(", "").replace(")", "").replace(" ", "").replace("-", "");
            this._mainPhone = phoneNumber;

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

    // Рефактор для двух CMS, а также подумать, на какое событие лучше повесить
    // метод, чтобы в случае добавления новых атрибутов в tg.pulse они не пропадали.
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

            // сделать кроссплатформенное обнаружение форм, не через tildaspec-phone-part.
            // у нас есть еще webflow
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

    // Главный метод для валидации сабмита формы. Нужен аккуратный рефакторинг с учетом наличия двух CMS
    subValidation(forms) {
        // конкретно тут может быть проблема с safari, так как subValidation запускается сразу после инициализации объекта класса
        try {
            console.log("subValidation was called;");

            for (const form of forms) {
                this._fuTilda(form);
                // вынести до myObserver в отдельную функцию с учетом двух CMS
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

                // оптимизировать проверку полей и вынести повторяющийся код
                // в отдельную функцию
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
                        this._mainEmail = emailField.value;

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
                            this.tgLinks.forEach(link => {
                                if (link && link != null){
                                    link.href = this._constructSendPulseLink({"phone_number": this._mainPhone, "email": this._mainEmail});
                                }
                            });
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
        this.lastNameHelper(this.forms);
        this.subValidation(this.forms);
        this.phoneHelper();
        this.insertHiddenFieldsInForms(this.settings.hiddenFields);
    }
}
