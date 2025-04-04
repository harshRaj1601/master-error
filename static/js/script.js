// static/js/script.js
document.addEventListener('DOMContentLoaded', function() {
    // Load additional CodeMirror addons for auto-closing brackets
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/closebrackets.min.js')
        .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/matchbrackets.min.js'))
        .then(() => {
            // Initialize CodeMirror editor after addons are loaded
            const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
                mode: 'python',
                theme: 'dracula',
                lineNumbers: true,
                indentUnit: 4,
                autoCloseBrackets: true,
                matchBrackets: true,
                lineWrapping: true
            });

            // Create a session ID for this browser tab
            const sessionId = uuid.v4();
            
            // DOM elements
            const analyzeBtn = document.getElementById('analyze-btn');
            const executeBtn = document.getElementById('execute-btn');
            const clearBtn = document.getElementById('clear-btn');
            const analysisOutput = document.getElementById('analysis-output');
            const executionOutput = document.getElementById('execution-output');
            
            // Function to display error message
            function showError(element, message) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error';
                errorDiv.textContent = message;
                element.innerHTML = '';
                element.appendChild(errorDiv);
            }
            
            // Function to analyze code
            analyzeBtn.addEventListener('click', function() {
                const code = codeEditor.getValue();
                
                if (!code.trim()) {
                    showError(analysisOutput, 'Please enter code for analysis.');
                    return;
                }
                
                analysisOutput.innerHTML = 'Analyzing code...';
                
                fetch('/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: code,
                        session_id: sessionId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showError(analysisOutput, data.error);
                    } else {
                        analysisOutput.innerHTML = data.html;
                    }
                })
                .catch(error => {
                    showError(analysisOutput, 'Failed to analyze code: ' + error.message);
                });
            });
            
            // Function to execute code
            executeBtn.addEventListener('click', function() {
                const code = codeEditor.getValue();
                
                if (!code.trim()) {
                    showError(executionOutput, 'Please enter code for execution.');
                    return;
                }
                
                // Create a new execution result element
                const resultDiv = document.createElement('div');
                resultDiv.className = 'execution-result-item';
                resultDiv.innerHTML = '<h3>Executing...</h3>';
                executionOutput.prepend(resultDiv);
                
                fetch('/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: code,
                        session_id: sessionId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        resultDiv.innerHTML = `<div class="error">${data.error}</div>`;
                    } else {
                        resultDiv.innerHTML = `<h3>Execution Result:</h3><div>${data.html}</div>`;
                    }
                })
                .catch(error => {
                    resultDiv.innerHTML = `<div class="error">Failed to execute code: ${error.message}</div>`;
                });
            });
            
            // Clear history
            clearBtn.addEventListener('click', function() {
                fetch('/clear', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        session_id: sessionId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        analysisOutput.innerHTML = '';
                        executionOutput.innerHTML = '';
                        const successDiv = document.createElement('div');
                        successDiv.className = 'success';
                        successDiv.textContent = data.message;
                        analysisOutput.appendChild(successDiv);
                    }
                })
                .catch(error => {
                    showError(analysisOutput, 'Failed to clear history: ' + error.message);
                });
            });
        });

    // Helper function to dynamically load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }
});