
let allProducts = [];

// عرض المنتجات
async function displayProducts() {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "جاري التحميل...";

    const { data: products, error } = await db
        .from("products")
        .select("*")
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


// الطلب عبر WhatsApp
function orderProduct(name, price) {
    const phone = "213557518755";

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
