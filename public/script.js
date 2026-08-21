const API_BASE_URL = (window.__API_BASE_URL__ || "https://<your-render-app-name>.onrender.com").replace(/\/$/, "");

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {

    const employeeId = document.getElementById("employeeId").value;
    const password = document.getElementById("password").value;

    if (employeeId === "" || password === "") {
        document.getElementById("message").textContent =
            "社員IDとパスワードを入力してください";
        return;
    }

    const response = await fetch(`${API_BASE_URL}/login`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            employeeId,
            password
        })
       

    });

    const data = await response.json();

    console.log(data);

    if (data.success) {

    const storedEmployeeId = data.user.employee_id ?? data.user.employeeId ?? employeeId;

    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("employeeId", storedEmployeeId);
    localStorage.setItem("role", data.user.role ?? (storedEmployeeId === "EMP001" ? "admin" : "employee"));

    const isMobileScreen = window.matchMedia("(max-width: 768px)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobileScreen) {
        window.location.href = "mobile-menu.html";
    } else {
        window.location.href = "dashboard.html";
    }

} else {

    document.getElementById("message").textContent =
        data.message;

}

});