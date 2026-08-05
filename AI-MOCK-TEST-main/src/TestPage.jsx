import React, { useState } from "react";

function TestPage() {
  const [message, setMessage] = useState("");

  const callApi = () => {
    fetch("http://localhost:8081/hello")
      .then((response) => response.text())
      .then((data) => {
        setMessage(data);
      })
      .catch((error) => {
        console.error("Error:", error);
        setMessage("API call failed");
      });
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>React Test Page</h2>

      <button onClick={callApi}>
        Call Hello API
      </button>

      <p style={{ marginTop: "20px", color: "green" }}>
        {message}
      </p>
    </div>
  );
}

export default TestPage;