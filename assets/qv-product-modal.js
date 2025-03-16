document.addEventListener("DOMContentLoaded", (event) => {

    class quickViewBtnHandler extends HTMLElement {

        constructor() {
          super();
          this.qvElementModal = document.querySelector('[qv-product-modal]');
          this.modalCloseBtn = document.querySelectorAll(".qv-modal-close")[0];
        }
      
        connectedCallback() {
          this.addEventListener("click", this.quickViewEventHandler.bind(this))
          this.modalCloseBtn.addEventListener("click", this.popupCloseEventHandler.bind(this));
         
        }
      
        popupCloseEventHandler(){
          this.qvElementModal.style.display = "none";
          this.qvElementModal.querySelector("quickview-popup-content")?.remove();
          document.querySelector('body').classList.remove('qv-modal-open');
        }
      
        quickViewEventHandler(e) {
        
          this.fetchAndExtractProductHTML(e.currentTarget.dataset.productPageUrl)
          .then(productElement => {
            if (productElement instanceof HTMLElement) {
              const qvBodyContent = document.createElement("quickview-popup-content");
              qvBodyContent.appendChild(productElement);
              const modalContentContainer = this.qvElementModal.querySelector("[qv-product-modal] [modal-content]");
              modalContentContainer.innerHTML = '';
              modalContentContainer.appendChild(qvBodyContent);
              this.qvElementModal.style.display = "flex";
              document.querySelector('body').classList.add('qv-modal-open');
            } else {
              console.error("Error: productElement is not an HTMLElement");
            }
          })
          .catch(error => {
            console.error('Error fetching product HTML:', error);
          });
        }
        
        async fetchAndExtractProductHTML(url) {
          try {
            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const productElement = doc.querySelector('.product-quick-block');
            return productElement;
          } catch (error) {
            console.error('Error fetching or parsing HTML:', error);
            return [];
          }
        }
        
        disconnectedCallback() {
          //console.log("Custom element removed from page.");
        }
      
        adoptedCallback() {
          //console.log("Custom element moved to new page.");
        }
      }
      
      customElements.define("quick-button", quickViewBtnHandler);

      class quickViewPopupContent extends quickViewBtnHandler {
        constructor() {
            super();
            this.currentproduct = null;
            this.variantOptions = null;
            this.currentproductJSON = null;
            this.currentVariant = null;
            this.atcButton = null;
            this.form = null;
            this.quantity = 1;
            this.quantityEl = null;
            this.cart = null;

            // Update Theme name from Here.
            this.themeName = "Dawn"
        }

        connectedCallback() {

            document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
                const selected = dropdown.querySelector('.custom-dropdown__selected');
                const optionsList = dropdown.querySelector('.custom-dropdown__options');
                const hiddenInput = dropdown.querySelector('input[type="radio"]');
                
                // Show/Hide dropdown on click
                selected.addEventListener('click', () => {
                    optionsList.classList.toggle('active');
                });
                
                // Handle option selection
                optionsList.querySelectorAll('.custom-dropdown__option').forEach(option => {
                    option.addEventListener('click', () => {
                    selected.textContent = option.textContent;
                    hiddenInput.value = option.getAttribute('data-value');
                    optionsList.classList.remove('active');
                
                    // Remove 'selected' class from all options and add to the current one
                    optionsList.querySelectorAll('.custom-dropdown__option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    // Dispatch the change event
                    const changeEvent = new Event('change', { bubbles: true });
                    hiddenInput.dispatchEvent(changeEvent);

                    hiddenInput.addEventListener("change", this.optionsChanged.bind(this));

                    });
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target)) {
                    optionsList.classList.remove('active');
                    }
                });
            });

            this.currentproductJSON = this.getQvProdJson();
            
            this.variantOptions = this.querySelector("[qv-variant-selects]");
            this.variantOptions.addEventListener("change", this.optionsChanged.bind(this));
            this.atcButton = this.querySelector("[qv-button-atc]");
            this.quantityEl = this.querySelector('[name="quantity"]');
            
            this.qvForm = this.querySelector("form");
            this.qvForm.addEventListener("submit", this.formSubmitEventHandler.bind(this));
        }

        getQvProdJson() {

            const scriptElement = this.querySelector(`[type="application/ld+json"]`);

            if (scriptElement) {
                try {
                    const jsonText = scriptElement.textContent;
                    const jsonData = JSON.parse(jsonText);
                    return jsonData;
                } catch (error) {
                    console.error('Error parsing JSON-LD:', error);
                    return null;
                }
            } else {
                return null;
            }

        }

        optionsChanged (e) {
            let currentTarget = e.currentTarget;
            let optionsArray = []
            let totalOptions = 2;
            let optionsString = "";
        
            for(let i = 0; i <= totalOptions; i++ ){
                if(currentTarget.querySelector(`#ProductSelect-option-${ i }`)) {
                    currentTarget.querySelector(`#ProductSelect-option-${ i }`)
                    optionsArray.push(currentTarget.querySelector(`#ProductSelect-option-${ i } input:checked`).value)
                }
            }
            optionsString = optionsArray.join(' / ');
            this.currentVariant = this.getVariantDetails(optionsString)
            this.updateQvProductDetails()
        }

        updateQvProductDetails() {
            if(!this.currentVariant){
                // variant Unavailable, do nothing !!
                // console.warn("variant Unavailable !!");
                return;
            }
    
            if(this.currentVariant.available){
                // Variant In Stock !!
                this.atcButton.querySelector('span').innerText = "Add To Cart"
                this.atcButton.disabled = false;
        
            }
            else{
                // Variant Out Of Stock !!
                this.atcButton.querySelector('span').innerText = "Sold Out"
                this.atcButton.disabled = true;
            }
    
            this.querySelector("input[name=id]").value = this.currentVariant.id;
            
            this.querySelector("[qv-price-main] [qv-price]").textContent = Shopify.formatMoney(this.currentVariant.price);
            this.querySelector("[qv-price-main] [qv-compare-at-price]").textContent = "";
            if(this.currentVariant.compare_at_price){
                this.querySelector("[qv-price-main] [qv-compare-at-price]").textContent = Shopify.formatMoney(this.currentVariant.compare_at_price);
            }
        
        }

        getVariantDetails(variantString) {
            return this.currentproductJSON.variants.filter(variant => variant.title === variantString)[0];
        }

        formSubmitEventHandler(e) {
            e.preventDefault();

            let isValid = true;
    
            // Validate custom dropdowns
            this.qvForm.querySelectorAll('.custom-dropdown').forEach(dropdown => {
            const dropdownInput = dropdown.querySelector('input[type="radio"]');
            
                if (!dropdownInput.value) {
                    isValid = false;
                    dropdown.classList.add('error');
                } else {
                    dropdown.classList.remove('error');
                }
            });

            if(isValid){
                this.fetchAndAddToCart(e.currentTarget) 
            }
        }
        
        fetchAndAddToCart(formEl) {
        let addToCartForm = formEl;
        let formData = new FormData(addToCartForm);
        let _this1 = this;
    
        // for Dawn theme cart udpates
        if(this.themeName == "Dawn"){
            // for Dawn theme cart udpates
            this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
            if (this.cart) {
            formData.append(
                'sections',
                this.cart.getSectionsToRender().map((section) => section.id)
            );
            formData.append('sections_url', window.location.pathname);
            this.cart.setActiveElement(document.activeElement);
            }
        }
        
        fetch(window.Shopify.routes.root + 'cart/add.js', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            return response.json();
        })
        .then(response => {
            
            if( response.variant_title == 'M / Black' ) {
                let autoProduct = document.querySelector('.automatic-product');
                const autoProductValue = autoProduct.dataset.productVariantId;
                if(autoProduct){
                    let automateformData = JSON.stringify({
                        'items': [{
                        'id': autoProductValue,
                        'quantity': 1
                        }]
                    });
                    fetch(window.Shopify.routes.root + 'cart/add.js', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: automateformData
                        })
                    .then(response1 => {
                        return response1.json();
                    })
                    .then(response1 => {
                        publish(PUB_SUB_EVENTS.cartUpdate, {
                        source: 'product-form',
                        productVariantId: autoProductValue,
                        cartData: response1,
                        });
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
                }
                
            }
            
            switch(_this1.themeName) {
            case "Dawn":
                // Cart Update code for Dawn Theme.
                this.updateDawnCartVitals("Dawn", response, formData);
                break;
            
            default:
                // code block
            }
        })
        .finally(() => {
            _this1.popupCloseEventHandler();
        })
        .catch((error) => {
            console.error('Error:', error);
        });
        }

        updateDawnCartVitals(themeName, response, formData) {
            if(!this.cart){
              window.location = window.routes.cart_url;
            }
            
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
        
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
        }
          
        disconnectedCallback() {
        // console.log("Custom element removed from page.");
        }
    
        adoptedCallback() {
        // console.log("Custom element moved to new page.");
        }

      }

      customElements.define("quickview-popup-content", quickViewPopupContent);


        var Shopify = Shopify || {};
        Shopify.money_format = "${{amount}}";
        Shopify.formatMoney = function(cents, format) {
        if (typeof cents == 'string') { cents = cents.replace('.',''); }
        var value = '';
        var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
        var formatString = (format || this.money_format);
        
        function defaultOption(opt, def) {
            return (typeof opt == 'undefined' ? def : opt);
        }
        
        function formatWithDelimiters(number, precision, thousands, decimal) {
            precision = defaultOption(precision, 2);
            thousands = defaultOption(thousands, ',');
            decimal   = defaultOption(decimal, '.');
        
            if (isNaN(number) || number == null) { return 0; }
        
            number = (number/100.0).toFixed(precision);
        
            var parts   = number.split('.'),
                dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
                cents   = parts[1] ? (decimal + parts[1]) : '';
        
            return dollars + cents;
        }
        
        switch(formatString.match(placeholderRegex)[1]) {
            case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
            case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
            case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
            case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
        }
        
        return formatString.replace(placeholderRegex, value);
        };
      
})