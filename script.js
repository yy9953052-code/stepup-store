let allProducts = [];
let currentStore = null;

// قراءة اسم المتجر (slug) من الرابط
function getStoreSlug() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("store");
    if (fromQuery) return fromQuery.toLowerCase();

    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (path && !path.includes(".") && !path.includes("/")) {
        return path.toLowerCase();
    }
    return "stepup-shoes";
}

// عرض المنتجات
async function displayProducts() {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "جاري التحميل...";

    const slug = getStoreSlug();

    const { data: store, error: storeError } = await db
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

    if (storeError) {
        productList.innerHTML = "صار خطأ في تحميل المتجر";
        console.log(storeError);
        return;
    }

    if (!store) {
        productList.innerHTML = "هذا المتجر غير موجود";
        return;
    }

    currentStore = store;
    document.title = store.name;

    const { data: products, error } = await db
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

    if (error) {
        productList.innerHTML = "صار خطأ في تحميل المنتجات";
        console.log(error);
        return;
    }

    allProducts = products || [];
    showFilteredProducts(allProducts);
}


// عرض المنتجات حسب التصنيف
function showFilteredProducts(products) {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "";

    if (products.length === 0) {
        productList.innerHTML = "ما كاين حتى منتج في هذا التصنيف";
        return;
    }

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="category">
                التصنيف: ${product.category || "غير محدد"}
            </p>
            <p class="price">${product.price} DA</p>
            <p class="description">${product.description || ""}</p>

            <button onclick="orderProduct('${product.name}', ${product.price})">
                اطلب الآن
            </button>
        `;

        productList.appendChild(card);
    });
}


// فلترة المنتجات
function filterProducts() {
    const selectedCategory =
        document.getElementById("category-filter").value;

    if (selectedCategory === "الكل") {
        showFilteredProducts(allProducts);
        return;
    }

    const filteredProducts = allProducts.filter(product =>
        product.category === selectedCategory
    );

    showFilteredProducts(filteredProducts);
}


// الطلب عبر WhatsApp (رقم المتجر الحالي)
function orderProduct(name, price) {
    if (!currentStore || !currentStore.whatsapp) {
        alert("رقم الواتساب غير متوفر لهذا المتجر");
        return;
    }

    const phone = currentStore.whatsapp;

    const message =
        "السلام عليكم، حبيت نطلب: " +
        name +
        " بسعر " +
        price +
        " DA";

    const url =
        "https://wa.me/" +
        phone +
        "?text=" +
        encodeURIComponent(message);

    window.open(url, "_blank");
}


// تشغيل المتجر
displayProducts();
