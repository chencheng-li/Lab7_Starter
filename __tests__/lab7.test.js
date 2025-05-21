describe('Basic user flow for Website', () => {
  // First, visit the lab 7 website
  beforeAll(async () => {
    await page.goto('https://cse110-sp25.github.io/CSE110-Shop/');
  });

  // Each it() call is a separate test
  // Here, we check to make sure that all 20 <product-item> elements have loaded
  it('Initial Home Page - Check for 20 product items', async () => {
    console.log('Checking for 20 product items...');

    // Query select all of the <product-item> elements and return the length of that array
    const numProducts = await page.$$eval('product-item', (prodItems) => {
      return prodItems.length;
    });

    // Expect there that array from earlier to be of length 20, meaning 20 <product-item> elements where found
    expect(numProducts).toBe(20);
  });

  // Check to make sure that all 20 <product-item> elements have data in them
  // We use .skip() here because this test has a TODO that has not been completed yet.
  // Make sure to remove the .skip after you finish the TODO. 
  it('Make sure <product-item> elements are populated', async () => {
    console.log('Checking to make sure <product-item> elements are populated...');

    // Start as true, if any don't have data, swap to false
    let allArePopulated = true;

    // Query select all of the <product-item> elements
    const prodItemsData = await page.$$eval('product-item', prodItems => {
      return prodItems.map(item => {
        // Grab all of the json data stored inside
        return data = item.data;
      });
    });

    // Loop through each product item's data
    for (let i = 0; i < prodItemsData.length; i++) {
      const itemData = prodItemsData[i];

      // Check if title is empty or not a string
      if (typeof itemData.title !== 'string' || itemData.title.length === 0) {
        allArePopulated = false;
        break; 
      }

      // Check if price is not a positive number
      if (typeof itemData.price !== 'number' || itemData.price <= 0) {
        allArePopulated = false;
        break; 
      }

      // Check if image URL is empty or not a string
      if (typeof itemData.image !== 'string' || itemData.image.length === 0) {
        allArePopulated = false;
        break; 
      }
    }


  }, 10000);

  // Check to make sure that when you click "Add to Cart" on the first <product-item> that
  // the button swaps to "Remove from Cart"
  it('Clicking the "Add to Cart" button should change button text', async () => {
    console.log('Checking the "Add to Cart" button...');

    // 1. Get the first <product-item> element.
    const firstProductItemHandle = await page.$('product-item');

    if (!firstProductItemHandle) {
      throw new Error('Could not find any <product-item> element.');
    }

    // 2. Get the shadowRoot of the first <product-item>.
    //    elementHandle.evaluateHandle() allows us to execute a function in the browser context
    //    on the element and return a JSHandle to the result (in this case, the shadowRoot).
    const shadowRootHandle = await firstProductItemHandle.evaluateHandle(el => el.shadowRoot);
    
    // 3. Wait for the button to appear within the shadowRoot and get its handle.
    //    We'll use a polling mechanism with a timeout, as waitForSelector on shadowRootHandle directly
    //    can sometimes be tricky or not available in all contexts.
    //    A more direct way is to use shadowRootHandle.$() if we are sure it's rendered,
    //    or combine it with a wait.
    
    let shadowButtonHandle;
    try {
      // Wait for the button using page.waitForFunction which is more flexible
      // This function will be re-evaluated in the browser until it returns a truthy value or times out.
      await page.waitForFunction(
        (productItem) => productItem.shadowRoot && productItem.shadowRoot.querySelector('button'),
        { timeout: 3000 }, // Increased timeout slightly for this specific wait
        firstProductItemHandle // Pass the handle to be used as the first argument in the function
      );
      // If the function above didn't throw, the button exists. Now get the handle.
      // Re-evaluate to get the button handle from the shadowRoot context
      shadowButtonHandle = await shadowRootHandle.$('button');

    } catch (e) {
      console.error('Button did not appear in shadowRoot of first product-item within timeout.', e);
      throw e;
    }

    if (!shadowButtonHandle) {
      throw new Error('Could not get a handle for the button inside the shadowRoot, even after waiting.');
    }

    // 4. Click the button.
    await shadowButtonHandle.click();

    // 5. Get the innerText of the button after the click.
    const newButtonText = await shadowButtonHandle.evaluate(button => button.innerText);

    // 6. Assert that the button text is "Remove from Cart".
    expect(newButtonText).toBe('Remove from Cart');

  }, 5000); // Increased overall test timeout slightly

  it('Checking number of items in cart on screen', async () => {
    console.log('Checking number of items in cart on screen...');

    // 1. Query select all of the <product-item> elements.
    const productItemHandles = await page.$$('product-item');
    expect(productItemHandles.length).toBe(20); // Double check we have 20 items

    // 2. For every single product element, get its button and click it
    //    ONLY IF its text is "Add to Cart".
    //    This handles the case where the first item might already be in the cart from STEP 2.
    for (const itemHandle of productItemHandles) {
      // It's good practice to wait for the button to be interactable
      // We'll use waitForFunction for robustness as in STEP 2
      let buttonHandle;
      try {
        await page.waitForFunction(
          (productItem) => productItem.shadowRoot && productItem.shadowRoot.querySelector('button'),
          { timeout: 1000 }, // Shorter timeout per button, as there are many
          itemHandle
        );
        const shadowRootHandle = await itemHandle.evaluateHandle(el => el.shadowRoot);
        buttonHandle = await shadowRootHandle.$('button');
      } catch (e) {
        console.error('Button did not appear in a product-item within timeout.', e);
        // If a button doesn't appear, we should probably fail the test or log it.
        // For this lab, let's assume if it doesn't appear, we can't click it.
        continue; // Skip to the next item if button not found quickly
      }

      if (buttonHandle) {
        const buttonText = await buttonHandle.evaluate(button => button.innerText);
        if (buttonText === 'Add to Cart') {
          await buttonHandle.click();
          // Optional: wait for a brief moment or for cart count to potentially update if needed,
          // but typically click is sufficient if event handling is synchronous.
        }
      } else {
        console.warn('Button handle not found for an item after wait.');
      }
    }

    // 3. Check to see if the innerText of #cart-count is 20.
    const cartCount = await page.$eval('#cart-count', el => el.innerText);
    expect(cartCount).toBe('20');

  }, 20000); // Increased timeout for this test as it interacts with many elements

  it('Checking number of items in cart on screen after reload', async () => {
    console.log('Checking number of items in cart on screen after reload...');

    // 1. Reload the page.
    await page.reload();

    // After reload, we need to re-query elements.

    // 2. Select all of the <product-item> elements.
    const productItemHandles = await page.$$('product-item');
    expect(productItemHandles.length).toBe(20); // Ensure all items are still there

    // Check every element to make sure that all of their buttons say "Remove from Cart".
    let allButtonsCorrect = true;
    for (const itemHandle of productItemHandles) {
      let buttonHandle;
      let buttonText = '';
      try {
        // Wait for the button to be available in the shadow DOM of the current item
        await page.waitForFunction(
          (productItem) => productItem.shadowRoot && productItem.shadowRoot.querySelector('button'),
          { timeout: 1000 }, // Timeout for each button
          itemHandle
        );
        const shadowRootHandle = await itemHandle.evaluateHandle(el => el.shadowRoot);
        buttonHandle = await shadowRootHandle.$('button');
        
        if (buttonHandle) {
          buttonText = await buttonHandle.evaluate(button => button.innerText);
          if (buttonText !== 'Remove from Cart') {
            allButtonsCorrect = false;
            console.error(`Button text is "${buttonText}" instead of "Remove from Cart" for an item after reload.`);
            break; // Exit loop if one is incorrect
          }
        } else {
          console.error('Button handle not found in an item after reload and wait.');
          allButtonsCorrect = false;
          break;
        }
      } catch (e) {
        console.error('Error waiting for or querying button in an item after reload:', e);
        allButtonsCorrect = false;
        break;
      }
    }
    expect(allButtonsCorrect).toBe(true); // Assert all buttons showed "Remove from Cart"

    // 3. Also check to make sure that #cart-count is still 20.
    //    We might need to wait for #cart-count to be updated by the script after reload.
    await page.waitForFunction(() => document.querySelector('#cart-count').innerText === '20', { timeout: 2000 });
    const cartCount = await page.$eval('#cart-count', el => el.innerText);
    expect(cartCount).toBe('20');

  }, 20000); // Increased timeout for this test

  it('Checking the localStorage to make sure cart is correct', async () => {
    console.log('Checking the localStorage for the full cart...'); // Added a console log for clarity

    // 1. Get the 'cart' item from localStorage.
    //    page.evaluate() allows us to run a function in the browser's context.
    const localStorageCart = await page.evaluate(() => {
      return localStorage.getItem('cart');
    });

    // 2. Define the expected string value.
    const expectedCartString = '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]';

    // 3. Assert that the localStorage value matches the expected string.
    expect(localStorageCart).toBe(expectedCartString);
  });

  it('Checking number of items in cart on screen after removing from cart', async () => {
    console.log('Checking cart count after removing all items...');

    // 1. Query select all of the <product-item> elements.
    const productItemHandles = await page.$$('product-item');
    expect(productItemHandles.length).toBe(20); // Sanity check

    // 2. For every single product element, get its button and click it
    //    IF its text is "Remove from Cart".
    for (const itemHandle of productItemHandles) {
      let buttonHandle;
      try {
        // Wait for the button to be available
        await page.waitForFunction(
          (productItem) => productItem.shadowRoot && productItem.shadowRoot.querySelector('button'),
          { timeout: 1000 }, // Timeout for each button
          itemHandle
        );
        const shadowRootHandle = await itemHandle.evaluateHandle(el => el.shadowRoot);
        buttonHandle = await shadowRootHandle.$('button');
        
        if (buttonHandle) {
          const buttonText = await buttonHandle.evaluate(button => button.innerText);
          if (buttonText === 'Remove from Cart') { // Only click if it says "Remove from Cart"
            await buttonHandle.click();
            // Optional: A small delay or wait for a specific visual cue if removal is not instantaneous,
            // but usually click is enough if the event updates synchronously.
          } else {
            // This case should ideally not happen if STEP 4 passed correctly
            console.warn(`Button text for an item was "${buttonText}", expected "Remove from Cart" before removing.`);
          }
        } else {
          console.error('Button handle not found in an item during removal step.');
        }
      } catch (e) {
        console.error('Error waiting for or querying button during removal step:', e);
        // Decide if this should fail the test or just log and continue
      }
    }

    // 3. Check to make sure that #cart-count is now 0.
    //    Wait for the cart count to update to '0'.
    try {
      await page.waitForFunction(() => document.querySelector('#cart-count').innerText === '0', { timeout: 3000 });
    } catch (e) {
      console.error('Cart count did not update to 0 within timeout.', e);
      // Fall through to the assertion to let Jest report the failure if it's not 0.
    }
    const cartCount = await page.$eval('#cart-count', el => el.innerText);
    expect(cartCount).toBe('0');

  }, 20000); // Increased timeout

  it('Checking number of items in cart on screen after reload (empty cart)', async () => { 
    console.log('Checking cart state after removing all items and reloading...');

    // 1. Reload the page.
    await page.reload();

    // After reload, re-query elements.

    // 2. Select all of the <product-item> elements.
    const productItemHandles = await page.$$('product-item');
    expect(productItemHandles.length).toBe(20); // Ensure all items are still there

    // Check every element to make sure that all of their buttons say "Add to Cart".
    let allButtonsCorrect = true;
    for (const itemHandle of productItemHandles) {
      let buttonHandle;
      let buttonText = '';
      try {
        // Wait for the button to be available
        await page.waitForFunction(
          (productItem) => productItem.shadowRoot && productItem.shadowRoot.querySelector('button'),
          { timeout: 1000 },
          itemHandle
        );
        const shadowRootHandle = await itemHandle.evaluateHandle(el => el.shadowRoot);
        buttonHandle = await shadowRootHandle.$('button');
        
        if (buttonHandle) {
          buttonText = await buttonHandle.evaluate(button => button.innerText);
          if (buttonText !== 'Add to Cart') { // Expect "Add to Cart" now
            allButtonsCorrect = false;
            console.error(`Button text is "${buttonText}" instead of "Add to Cart" for an item after empty cart reload.`);
            break; 
          }
        } else {
          console.error('Button handle not found in an item (empty cart reload).');
          allButtonsCorrect = false;
          break;
        }
      } catch (e) {
        console.error('Error waiting for or querying button (empty cart reload):', e);
        allButtonsCorrect = false;
        break;
      }
    }
    expect(allButtonsCorrect).toBe(true); // Assert all buttons showed "Add to Cart"

    // 3. Also check to make sure that #cart-count is still 0.
    //    Wait for the cart count to update to '0'.
    try {
      await page.waitForFunction(() => document.querySelector('#cart-count').innerText === '0', { timeout: 2000 });
    } catch (e) {
        console.error('Cart count did not show 0 within timeout (empty cart reload).', e);
    }
    const cartCount = await page.$eval('#cart-count', el => el.innerText);
    expect(cartCount).toBe('0');

  }, 20000); // Increased timeout

  // Checking to make sure that localStorage for the cart is as we'd expect for the
  // cart being empty
  it('Checking the localStorage to make sure cart is correct (empty cart)', async () => { 
    console.log('Checking the localStorage for the empty cart...');

    // 1. Get the 'cart' item from localStorage.
    const localStorageCart = await page.evaluate(() => {
      return localStorage.getItem('cart');
    });

    // 2. Define the expected string value for an empty cart.
    const expectedCartString = '[]';

    // 3. Assert that the localStorage value matches the expected string.
    expect(localStorageCart).toBe(expectedCartString);
  });
});
