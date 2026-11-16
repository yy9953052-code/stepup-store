async function displayProducts() {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "جاري التحميل...";

    try {
        const { data: products, error } = await db
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            productList.innerHTML = "خطأ: " + error.message;
            console.log(error);
            return;
        }

        productList.innerHTML = "";

        if (products.length === 0) {
            productList.innerHTML = "ما كاين حتى منتج دوك";
            return;
        }

        products.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";

            card.innerHTML = `
                <img src="${product.image_url}">
                <h3>${product.name}</h3>
                <p class="price">${product.price} DA</p>
                <button onclick="orderProduct('${product.name}', ${product.price})">
                    اطلب الآن
                </button>
            `;

            productList.appendChild(card);
        });
    } catch (e) {
        productList.innerHTML = "خطأ في الاتصال: " + e.message;
    }
}

function orderProduct(name, price) {
    const phone = "213557518755";
    const message = "السلام عليكم، حبيت نطلب: " + name + " بسعر " + price + " DA";
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank");
}

displayProducts();
