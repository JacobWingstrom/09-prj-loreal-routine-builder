/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Store all loaded products here */
let allProducts = [];
/* Store the currently displayed (filtered) products */
let currentProducts = [];
/* Store selected product IDs */
let selectedProductIds = loadSelectedProductIds();

/* Helper: Load selected product IDs from localStorage */
function loadSelectedProductIds() {
  const saved = localStorage.getItem("selectedProductIds");
  try {
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/* Helper: Save selected product IDs to localStorage */
function saveSelectedProductIds() {
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(selectedProductIds)
  );
}

/* Load product data from JSON file */
async function loadProducts() {
  // Fetch products.json and return the products array
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* --- Add Product Search Field --- */
// Create a search input and insert it above the products grid
const searchSection = document.querySelector(".search-section");
const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.id = "productSearch";
searchInput.placeholder = "Search products by name or keyword...";
searchInput.style.marginTop = "16px";
searchInput.style.width = "100%";
searchInput.style.padding = "12px";
searchInput.style.fontSize = "16px";
searchSection.appendChild(searchInput);

// Store the current search term
let currentSearchTerm = "";

/* Create HTML for displaying product cards and enable selection */
function displayProducts(products) {
  // Filter by search term if present
  let filtered = products;
  if (currentSearchTerm.trim() !== "") {
    const term = currentSearchTerm.trim().toLowerCase();
    filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        (product.description &&
          product.description.toLowerCase().includes(term))
    );
  }

  // If no category is selected or filtered array is empty, show placeholder and return
  if (!categoryFilter.value || filtered.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
    currentProducts = [];
    return;
  }

  productsContainer.innerHTML = "";
  currentProducts = filtered; // Save the current filtered products

  filtered.forEach((product) => {
    // Create product card
    const card = document.createElement("div");
    card.className = "product-card";
    // Highlight if selected
    if (selectedProductIds.includes(product.id)) {
      card.classList.add("selected");
    }
    // Add product image and info, and a description overlay
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-desc-overlay">
        <p>${product.description}</p>
      </div>
    `;
    // Toggle selection on click
    card.addEventListener("click", () => {
      toggleProductSelection(product.id);
    });
    productsContainer.appendChild(card);
  });
}

/* Function to toggle product selection */
function toggleProductSelection(productId) {
  const index = selectedProductIds.indexOf(productId);
  if (index === -1) {
    selectedProductIds.push(productId);
  } else {
    selectedProductIds.splice(index, 1);
  }
  saveSelectedProductIds();
  displayProducts(currentProducts);
  renderSelectedProducts();
}

/* Function to render selected products list */
function renderSelectedProducts() {
  selectedProductsList.innerHTML = "";
  selectedProductIds.forEach((id) => {
    const product = allProducts.find((p) => p.id === id);
    if (product) {
      const item = document.createElement("div");
      item.className = "selected-product-item";
      item.textContent = product.name;
      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", () => {
        toggleProductSelection(product.id);
      });
      item.appendChild(removeBtn);
      selectedProductsList.appendChild(item);
    }
  });

  // Add "Clear All" button if there are any selected products
  if (selectedProductIds.length > 0) {
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear All";
    clearBtn.className = "remove-btn";
    clearBtn.style.marginLeft = "10px";
    clearBtn.addEventListener("click", () => {
      selectedProductIds = [];
      saveSelectedProductIds();
      displayProducts(currentProducts);
      renderSelectedProducts();
    });
    selectedProductsList.appendChild(clearBtn);
  }
}

// Listen for input in the search field and update the grid
searchInput.addEventListener("input", () => {
  currentSearchTerm = searchInput.value;
  // Only filter within the currently selected category
  if (allProducts.length > 0 && categoryFilter.value) {
    const selectedCategory = categoryFilter.value;
    const filteredProducts = allProducts.filter(
      (product) => product.category === selectedCategory
    );
    displayProducts(filteredProducts);
    renderSelectedProducts();
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  // Load products only once and cache them
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  const selectedCategory = e.target.value;
  // Filter products by category
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
  renderSelectedProducts();
});

// Initial load - do not show any products until a category is selected
// Remove the initial display of all products

const userInput = document.getElementById("userInput");

let userName = "";
let messages = [
  {
    role: "system",
    content:
      // Updated system prompt for web search and citations
      "You are a routine builder assistant for L’Oréal. You use the gpt-4o model with web browsing enabled. When answering questions or building routines, search the web in real time for the latest information about L’Oréal products, skincare, haircare, or beauty routines. Include any relevant links or citations in your responses. Only recommend L’Oréal products and always explain your choices. If asked about non-L’Oréal products or unrelated topics, politely refuse.",
  },
];

// Ask for user name first
chatWindow.innerHTML = `<div class="message bot">Select your routine!!!</div>`;

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  // Display user message
  chatWindow.innerHTML += `<div class="message user">${userText}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
  userInput.value = "";

  // Add user message to messages history
  messages.push({ role: "user", content: userText });

  // Show typing indicator
  chatWindow.innerHTML += `<div class="message bot typing">...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const response = await fetch(
      // Update to your new Cloudflare Worker endpoint that supports web search
      "https://loreal-bot-search.jacobwingstrom.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model: "gpt-4o", web_search: true }),
      }
    );

    const data = await response.json();
    const botReply =
      data.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a response.";

    // Remove typing indicator
    chatWindow.querySelector(".typing").remove();

    // Show assistant reply
    chatWindow.innerHTML += `<div class="message bot">${botReply}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Add assistant reply to messages history
    messages.push({ role: "assistant", content: botReply });
  } catch (error) {
    console.error(error);
    chatWindow.querySelector(".typing").remove();
    chatWindow.innerHTML += `<div class="message bot error">⚠️ Sorry, there was a problem connecting. Please try again later.</div>`;
  }
});

// Get reference to the "Generate Routine" button
const generateRoutineBtn = document.getElementById("generateRoutine");

// When the user clicks "Generate Routine", send selected products to OpenAI API for a routine
generateRoutineBtn.addEventListener("click", async () => {
  // Collect selected product objects
  const selectedProducts = selectedProductIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean);

  // If no products are selected, show a message and return
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `<div class="message bot">Please select some products before generating a routine.</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  // Show user action in chat
  chatWindow.innerHTML += `<div class="message user">Generate a routine with my selected products.</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Show typing indicator
  chatWindow.innerHTML += `<div class="message bot typing">...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare a system prompt for the routine builder with web search
  const routineSystemPrompt = {
    role: "system",
    content:
      "You are a routine builder assistant for L’Oréal. You use the gpt-4o model with web browsing enabled. Given a list of selected L’Oréal products (with name, brand, category, and description), search the web for the latest information and generate a step-by-step personalized skincare, haircare, or beauty routine using only these products. Explain the order and purpose of each step in simple language. Include any relevant links or citations. Do not recommend products not in the list.",
  };

  // Prepare the user message with product data
  const routineUserMessage = {
    role: "user",
    content: `Here are my selected products:\n${JSON.stringify(
      selectedProducts,
      null,
      2
    )}\nPlease build a routine using only these products.`,
  };

  // Send to OpenAI API using beginner-friendly fetch/async/await
  try {
    const response = await fetch(
      // Update to your new Cloudflare Worker endpoint that supports web search
      "https://loreal-bot-search.jacobwingstrom.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [routineSystemPrompt, routineUserMessage],
          model: "gpt-4o",
          web_search: true,
        }),
      }
    );

    const data = await response.json();
    const routine =
      data.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a routine.";

    // Remove typing indicator
    chatWindow.querySelector(".typing").remove();

    // Show the generated routine in the chat window
    chatWindow.innerHTML += `<div class="message bot">${routine}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Add the routine as an assistant message to the main chat context
    messages.push({ role: "assistant", content: routine });
  } catch (error) {
    console.error(error);
    chatWindow.querySelector(".typing").remove();
    chatWindow.innerHTML += `<div class="message bot error">⚠️ Sorry, there was a problem generating your routine. Please try again later.</div>`;
  }
});

/* RTL Language Support */
// This function toggles RTL mode for the whole app
function setRTLMode(enabled) {
  // Set dir attribute on <html> and <body>
  document.documentElement.dir = enabled ? "rtl" : "ltr";
  document.body.dir = enabled ? "rtl" : "ltr";

  // Optionally add a class for extra RTL-specific CSS tweaks
  if (enabled) {
    document.body.classList.add("rtl-mode");
  } else {
    document.body.classList.remove("rtl-mode");
  }
}

// Example: Add a simple toggle button for demonstration (students can improve this)
const rtlToggle = document.createElement("button");
rtlToggle.textContent = "Toggle RTL";
rtlToggle.style.position = "fixed";
rtlToggle.style.top = "10px";
rtlToggle.style.right = "10px";
rtlToggle.style.zIndex = "1000";
rtlToggle.style.padding = "8px 16px";
rtlToggle.style.background = "#eee";
rtlToggle.style.border = "1px solid #ccc";
rtlToggle.style.cursor = "pointer";
document.body.appendChild(rtlToggle);

let rtlEnabled = false;
rtlToggle.addEventListener("click", () => {
  rtlEnabled = !rtlEnabled;
  setRTLMode(rtlEnabled);
});

// After page load, show selected products if any
renderSelectedProducts();
