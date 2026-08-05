"use client";

import { useState } from "react";

export default function TestPage() {
  const [message, setMessage] = useState("");

  const callApi = async () => {
    try {
      const response = await fetch("http://localhost:8081/hello");
      const text = await response.text();
      setMessage(text);
    } catch (error) {
      console.error(error);
      setMessage("API call failed");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Next.js Test Page</h2>

      <button onClick={callApi}>
        Call Hello API
      </button>

      <p style={{ marginTop: "20px", color: "green" }}>
        {message}
      </p>
    </div>
  );
}