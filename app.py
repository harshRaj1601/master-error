from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import markdown
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure the API key  # Replace with your actual API key or default value
genai.configure(api_key="")

# Shared generation configuration
generation_config = {
    "temperature": 0.7,  # Reduced temperature for more predictable responses
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 4096,  # Reduced to 4096 to avoid exceeding limits
    "response_mime_type": "text/plain",
}

# Initialize models
error_detector_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-exp",  # Updated to a more stable model
    generation_config=generation_config,
    system_instruction=(
        "You are a code analysis assistant. Your primary goal is to analyze user-provided code and provide helpful feedback."
        "Follow these guidelines:"
        "- Identify the code language and provide suggestions for potential errors."
        "- Offer corrected code snippets using optimized functions or classes where applicable."
        "- Always include potential errors and improvements, focusing on security and performance."
        "- Summarize your analysis with clear examples using functions and classes."
        "- Keep your responses concise and easy to understand."
        "- If the code is correct, provide 2 different ways to rewrite the code using optimised ways"
        "If the programming language does not naturally support functions or classes, suggest alternative approaches"
        "or provide code in a language that supports these concepts (with a brief explanation)."
    ),
)

executor_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-exp",  # Updated to a more stable model
    generation_config=generation_config,
    system_instruction=(
        "Assume you are a universal code executor:\n"
        "- Detect the programming language and display it.\n"
        "- Execute the code and show the output.\n"
        "- If errors occur, then give output of the error."
        "- if error comes include potential errors and improvements.\n"
    ),
)

# Chat sessions dictionary to maintain sessions
chat_sessions = {}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze_code():
    code = request.json.get("code", "")
    session_id = request.json.get("session_id", "default")

    if not code.strip():
        return jsonify({"error": "Please enter code for analysis."})

    try:
        # Create or get chat session
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                "error_detector": error_detector_model.start_chat(),
                "executor": executor_model.start_chat(),
            }

        # Send message to error detector
        response = chat_sessions[session_id]["error_detector"].send_message(code)

        # Convert markdown to HTML with extensions
        html_response = markdown.markdown(
            response.text,
            extensions=[
                "fenced_code",  # For code blocks
                "tables",  # For tables
                "nl2br",  # For converting newlines to line breaks
                "sane_lists",  # For cleaner lists
            ],
        )

        return jsonify({"text": response.text, "html": html_response})
    except Exception as e:
        return jsonify({"error": f"Error during analysis: {str(e)}"})


@app.route("/execute", methods=["POST"])
def execute_code():
    code = request.json.get("code", "")
    session_id = request.json.get("session_id", "default")

    if not code.strip():
        return jsonify({"error": "Please enter code for execution."})

    try:
        # Create or get chat session
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                "error_detector": error_detector_model.start_chat(),
                "executor": executor_model.start_chat(),
            }

        # Send message to executor
        response = chat_sessions[session_id]["executor"].send_message(code)

        # Convert markdown to HTML with extensions
        html_response = markdown.markdown(
            response.text,
            extensions=[
                "fenced_code",  # For code blocks
                "tables",  # For tables
                "nl2br",  # For converting newlines to line breaks
                "sane_lists",  # For cleaner lists
            ],
        )

        return jsonify({"text": response.text, "html": html_response})
    except Exception as e:
        return jsonify({"error": f"Error during execution: {str(e)}"})


@app.route("/clear", methods=["POST"])
def clear_history():
    session_id = request.json.get("session_id", "default")

    # Reset the chat sessions
    if session_id in chat_sessions:
        chat_sessions[session_id] = {
            "error_detector": error_detector_model.start_chat(),
            "executor": executor_model.start_chat(),
        }

    return jsonify({"message": "History cleared successfully"})


if __name__ == "__main__":
    app.run(debug=True)
