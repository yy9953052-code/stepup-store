// عرض المنتجات
async function showProducts() {
    const container = document.getElementById("admin-products");
    container.innerHTML = "جاري التحميل...";

    const { data: products, error } = await db
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        container.innerHTML = "صار خطأ في تحميل المنتجات";
        console.log(error);
        return;
    }

    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = "ما كاين حتى منتج دوك";
        return;
    }

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <img src="${product.image_url}">
                <h3>${product.name}</h3>
                <p>${product.price} DA</p>
                <button onclick="deleteProduct(${product.id})">
                    حذف المنتج
                </button>
            </div>
        `;
    });
}

// حذف منتج
async function deleteProduct(id) {
    const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
        alert("صار خطأ: " + error.message);
        return;
    }

    showProducts();
}

// تسجيل الدخول
async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("خطأ في الدخول: " + error.message);
        return;
    }

    checkSession();
}

// تسجيل الخروج
async function logout() {
    await db.auth.signOut();
    checkSession();
}

// نشوف واش البائع داخل
async function checkSession() {
    const { data } = await db.auth.getSession();

    if (data.session) {
        document.getElementById("login-box").style.display = "none";
        document.getElementById("admin-panel").style.display = "block";
        showProducts();
    } else {
        document.getElementById("login-box").style.display = "block";
        document.getElementById("admin-panel").style.display = "none";
    }
}

// تشغيل لوحة التحكم
checkSession();
async function addProduct() {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const fileInput = document.getElementById("image");
    const file = fileInput.files[0];

    if (!name || price <= 0 || !file) {
        alert("يرجى ملء جميع المعلومات واختيار صورة");
        return;
    }

    const extension = file.name.split(".").pop();
    const fileName = Date.now() + "." + extension;

    const { error: uploadError } = await db.storage
        .from("product-images")
        .upload(fileName, file);

    if (uploadError) {
        alert("خطأ في رفع الصورة: " + uploadError.message);
        return;
    }

    const { data: urlData } = db.storage
        .from("product-images")
        .getPublicUrl(fileName);

    const { error } = await db
        .from("products")
        .insert({ name: name, price: price, image_url: urlData.publicUrl });

    if (error) {
        alert("صار خطأ: " + error.message);
        return;
    }

    document.getElementById("name").value = "";
    document.getElementById("price").value = "";
    fileInput.value = "";

    showProducts();
    alert("تمت إضافة المنتج بنجاح!");
}
