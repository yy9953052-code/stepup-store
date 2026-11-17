
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

    if (!products || products.length === 0) {
        container.innerHTML = "ما كاين حتى منتج دوك";
        return;
    }

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price} DA</p>

                <button onclick="editProduct(${product.id})">
                    تعديل المنتج
                </button>

                <button onclick="deleteProduct(${product.id})">
                    حذف المنتج
                </button>
            </div>
        `;
    });
}


// تعديل منتج مع إمكانية تغيير الصورة
async function editProduct(id) {
    const { data: product, error } = await db
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !product) {
        alert("لم نتمكن من العثور على المنتج");
        return;
    }

    const newName = prompt("اكتب اسم المنتج الجديد:", product.name);

    if (newName === null) return;

    const newPrice = prompt("اكتب السعر الجديد:", product.price);

    if (newPrice === null) return;

    const name = newName.trim();
    const price = Number(newPrice);

    if (!name || !Number.isFinite(price) || price <= 0) {
        alert("يرجى إدخال اسم وسعر صحيحين");
        return;
    }

    let newImageUrl = product.image_url;

    const changeImage = confirm(
        "هل تريد تغيير صورة المنتج؟ اضغط OK لاختيار صورة جديدة، أو Cancel للاحتفاظ بالصورة القديمة."
    );

    if (changeImage) {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";

        const file = await new Promise(resolve => {
            fileInput.onchange = () => {
                resolve(fileInput.files[0] || null);
            };

            fileInput.click();
        });

        if (!file) {
            alert("لم تختر صورة، تم إلغاء التعديل");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("يرجى اختيار ملف صورة صحيح");
            return;
        }

        const extension = file.name.split(".").pop();
        const fileName = Date.now() + "-" + Math.random().toString(36).slice(2) + "." + extension;

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

        newImageUrl = urlData.publicUrl;
    }

    const { error: updateError } = await db
        .from("products")
        .update({
            name: name,
            price: price,
            image_url: newImageUrl
        })
        .eq("id", id);

    if (updateError) {
        alert("صار خطأ أثناء التعديل: " + updateError.message);
        return;
    }

    alert("تم تعديل المنتج بنجاح!");
    showProducts();
}


// حذف منتج
async function deleteProduct(id) {
    const confirmed = confirm("هل أنت متأكد من حذف هذا المنتج؟");

    if (!confirmed) return;

    const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
        alert("صار خطأ: " + error.message);
        return;
    }

    alert("تم حذف المنتج");
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


// التحقق من جلسة البائع
async function checkSession() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        console.log(error);
        return;
    }

    if (data.session) {
        document.getElementById("login-box").style.display = "none";
        document.getElementById("admin-panel").style.display = "block";
        showProducts();
    } else {
        document.getElementById("login-box").style.display = "block";
        document.getElementById("admin-panel").style.display = "none";
    }
}


// إضافة منتج
async function addProduct() {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const fileInput = document.getElementById("image");
    const file = fileInput.files[0];

    if (!name || !Number.isFinite(price) || price <= 0 || !file) {
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
        .insert({
            name: name,
            price: price,
            image_url: urlData.publicUrl
        });

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


// تشغيل لوحة التحكم
checkSession();
          
