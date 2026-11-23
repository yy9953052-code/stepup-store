
// عرض أي خطأ في الكود كرسالة (للتشخيص)
window.addEventListener("error", function (e) {
    alert("خطأ في الكود: " + e.message);
});

window.addEventListener("unhandledrejection", function (e) {
    alert("خطأ: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

let currentStore = null;


// إظهار واجهة إنشاء الحساب
function showRegister() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("register-box").style.display = "block";
}


// العودة إلى تسجيل الدخول
function showLogin() {
    document.getElementById("register-box").style.display = "none";
    document.getElementById("login-box").style.display = "block";
}


// إنشاء متجر التاجر
async function ensureStoreExists(user) {
    const { data: existingStore, error: searchError } = await db
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

    if (searchError) {
        alert("خطأ في التحقق من المتجر: " + searchError.message);
        return false;
    }

    if (existingStore) {
        return true;
    }

    const metadata = user.user_metadata || {};

    const storeName = metadata.store_name;
    const storeSlug = metadata.store_slug;
    const storeWhatsapp = metadata.store_whatsapp;

    if (!storeName || !storeSlug || !storeWhatsapp) {
        alert("حسابك لا يحتوي على بيانات متجر. يرجى التواصل مع الإدارة.");
        return false;
    }

    const { error: createError } = await db
        .from("stores")
        .insert({
            owner_id: user.id,
            name: storeName,
            slug: storeSlug,
            whatsapp: storeWhatsapp
        });

    if (createError) {
        alert("خطأ في إنشاء المتجر: " + createError.message);
        return false;
    }

    alert("تم إنشاء متجرك بنجاح!");
    return true;
}


// إنشاء حساب تاجر جديد
async function register() {
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const storeName = document.getElementById("store-name").value.trim();
    const storeSlug = document.getElementById("store-slug").value
        .trim()
        .toLowerCase();
    const whatsapp = document.getElementById("store-whatsapp").value.trim();

    if (!email || !password || !storeName || !storeSlug || !whatsapp) {
        alert("يرجى ملء جميع المعلومات");
        return;
    }

    if (password.length < 6) {
        alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) {
        alert("رابط المتجر يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطة بين الكلمات فقط");
        return;
    }

    if (!/^[0-9+ ]+$/.test(whatsapp)) {
        alert("يرجى إدخال رقم WhatsApp صحيح");
        return;
    }

    // التحقق من أن رابط المتجر غير مستخدم
    const { data: existingStore, error: checkError } = await db
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .maybeSingle();

    if (checkError) {
        alert("تعذر التحقق من رابط المتجر: " + checkError.message);
        return;
    }

    if (existingStore) {
        alert("هذا الرابط مستعمل بالفعل. اختر رابطًا آخر.");
        return;
    }

    // إنشاء الحساب بعد التأكد من توفر الرابط
    const { data, error } = await db.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                store_name: storeName,
                store_slug: storeSlug,
                store_whatsapp: whatsapp
            }
        }
    });

    if (error) {
        alert("خطأ في إنشاء الحساب: " + error.message);
        return;
    }

    if (data.session && data.user) {
        const storeCreated = await ensureStoreExists(data.user);

        if (!storeCreated) {
            return;
        }

        alert("تم إنشاء الحساب والمتجر بنجاح!");
        checkSession();
    } else {
        alert("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجل الدخول لإنشاء متجرك.");

        showLogin();

        document.getElementById("email").value = email;
        document.getElementById("password").value = "";
    }
}


// تحميل معلومات متجري وعرضها
async function loadMyStore(user) {
    const { data: store, error } = await db
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

    if (error || !store) {
        console.log(error);
        document.getElementById("store-info-name").textContent =
            "لم نجد متجرك";
        document.getElementById("store-info-link").textContent = "";
        currentStore = null;
        return false;
    }

    currentStore = store;

    const link = window.location.origin + "/?store=" + store.slug;

    document.getElementById("store-info-name").textContent =
        "متجرك: " + store.name;

    document.getElementById("store-info-link").textContent =
        "الرابط: " + link;

    return true;
}


// فتح متجري في تبويب جديد
function openMyStore() {
    if (!currentStore) {
        alert("لم نجد متجرك");
        return;
    }

    window.open(
        window.location.origin + "/?store=" + currentStore.slug,
        "_blank"
    );
}


// عرض المنتجات
async function showProducts() {
    const container = document.getElementById("admin-products");
    container.innerHTML = "جاري التحميل...";

    if (!currentStore) {
        container.innerHTML = "لم نجد متجرك";
        return;
    }

    const { data: products, error } = await db
        .from("products")
        .select("*")
        .eq("store_id", currentStore.id)
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
                <p>التصنيف: ${product.category || "غير محدد"}</p>
                <p>${product.description || ""}</p>

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


// تعديل منتج
async function editProduct(id) {
    if (!currentStore) {
        alert("لم نجد متجرك");
        return;
    }

    const { data: product, error } = await db
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("store_id", currentStore.id)
        .single();

    if (error || !product) {
        alert("لم نتمكن من العثور على المنتج");
        return;
    }

    const newName = prompt("اكتب اسم المنتج الجديد:", product.name);
    if (newName === null) return;

    const newPrice = prompt("اكتب السعر الجديد:", product.price);
    if (newPrice === null) return;

    const newDescription = prompt(
        "اكتب وصف المنتج الجديد:",
        product.description || ""
    );

    if (newDescription === null) return;

    const newCategory = prompt(
        "اكتب التصنيف الجديد (أحذية، ملابس، أدوات، إكسسوارات):",
        product.category || ""
    );

    if (newCategory === null) return;

    const name = newName.trim();
    const price = Number(newPrice);
    const description = newDescription.trim();
    const category = newCategory.trim();

    if (!name || !Number.isFinite(price) || price <= 0 || !category) {
        alert("يرجى إدخال اسم وسعر وتصنيف صحيح");
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

        const fileName = Date.now() + "-" +
            Math.random().toString(36).slice(2) + "." + extension;

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
            description: description,
            category: category,
            image_url: newImageUrl
        })
        .eq("id", id)
        .eq("store_id", currentStore.id);

    if (updateError) {
        alert("صار خطأ أثناء التعديل: " + updateError.message);
        return;
    }

    alert("تم تعديل المنتج بنجاح!");
    showProducts();
}


// حذف منتج
async function deleteProduct(id) {
    if (!currentStore) {
        alert("لم نجد متجرك");
        return;
    }

    const confirmed = confirm("هل أنت متأكد من حذف هذا المنتج؟");

    if (!confirmed) return;

    const { error } = await db
        .from("products")
        .delete()
        .eq("id", id)
        .eq("store_id", currentStore.id);

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
    currentStore = null;
    checkSession();
}


// التحقق من جلسة التاجر
async function checkSession() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        console.log(error);
        return;
    }

    if (data.session) {
        document.getElementById("login-box").style.display = "none";
        document.getElementById("register-box").style.display = "none";
        document.getElementById("admin-panel").style.display = "block";

        const storeReady = await ensureStoreExists(data.session.user);

        if (storeReady) {
            await loadMyStore(data.session.user);
            showProducts();
        } else {
            await db.auth.signOut();

            document.getElementById("admin-panel").style.display = "none";
            document.getElementById("login-box").style.display = "block";
        }
    } else {
        document.getElementById("login-box").style.display = "block";
        document.getElementById("register-box").style.display = "none";
        document.getElementById("admin-panel").style.display = "none";
    }
}


// إضافة منتج
async function addProduct() {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const category = document.getElementById("category").value;
    const fileInput = document.getElementById("image");
    const file = fileInput.files[0];

    if (!name || !Number.isFinite(price) || price <= 0 || !category || !file) {
        alert("يرجى ملء جميع المعلومات واختيار صورة");
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("يرجى اختيار ملف صورة صحيح");
        return;
    }

    const { data: userData, error: userError } =
        await db.auth.getUser();

    if (userError || !userData.user) {
        alert("لم نتمكن من التحقق من حسابك، سجل الدخول مجددًا");
        return;
    }

    const user = userData.user;

    if (!currentStore) {
        const loaded = await loadMyStore(user);

        if (!loaded) {
            alert("لا يوجد متجر مرتبط بهذا الحساب. يجب إنشاء متجر أولاً.");
            return;
        }
    }

    // التحقق من عدد المنتجات قبل رفع الصورة
    const { count: productCount, error: countError } = await db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", currentStore.id);

    if (countError) {
        alert("تعذر التحقق من عدد المنتجات: " + countError.message);
        return;
    }

    if (productCount >= 20) {
        alert("وصلت إلى الحد الأقصى لمتجرك: 20 منتجًا. احذف منتجًا قبل إضافة منتج جديد.");
        return;
    }

    // رفع الصورة بعد التأكد من أن المتجر لم يصل إلى الحد
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
            category: category,
            image_url: urlData.publicUrl,
            owner_id: user.id,
            store_id: currentStore.id
        });

    if (error) {
        alert("صار خطأ: " + error.message);
        return;
    }

    document.getElementById("name").value = "";
    document.getElementById("price").value = "";
    document.getElementById("category").value = "";
    fileInput.value = "";

    showProducts();

    alert("تمت إضافة المنتج بنجاح!");
}


// تشغيل لوحة التحكم
checkSession();
              
