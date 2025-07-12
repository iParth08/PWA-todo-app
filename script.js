// --- Configuration ---
const CLEAR_DATA_PASSWORD = "666666";
const CONFUSION_PENALTY = 5; // Points deducted for deleting an uncompleted todo

// --- Global Variables (Simulating Local Storage) ---
// Initialize from localStorage or with default values
let todos = JSON.parse(localStorage.getItem("todos")) || [];
let tags = JSON.parse(localStorage.getItem("tags")) || [
  // Academic Tags
  { name: "study", color: "#FFD700", priority: 1, effect: "plus" }, // Gold
  { name: "assignment", color: "#00BFFF", priority: 2, effect: "plus" }, // Deep Sky Blue
  { name: "lecture", color: "#90EE90", priority: 3, effect: "plus" }, // Light Green

  // Personal & Growth Tags
  { name: "self-care", color: "#FF69B4", priority: 2, effect: "plus" }, // Hot Pink
  { name: "skill-dev", color: "#8A2BE2", priority: 1, effect: "plus" }, // Blue Violet

  // Entertainment & Other Negative Tags
  { name: "gaming", color: "#FF4500", priority: 3, effect: "minus" }, // Orange Red
  { name: "social media", color: "#FF0000", priority: 3, effect: "minus" }, // Red
  { name: "streaming", color: "#800080", priority: 3, effect: "minus" }, // Purple
  { name: "procrastination", color: "#FFFF00", priority: 1, effect: "minus" }, // Yellow
  { name: "unplanned", color: "#696969", priority: 3, effect: "minus" }, // Dim Gray
];
let dailyScore = parseFloat(localStorage.getItem("dailyScore")) || 0;
let totalScore = parseFloat(localStorage.getItem("totalScore")) || 0;
let lastScoreUpdateDate = localStorage.getItem("lastScoreUpdateDate") || "";
// NEW: Score logs array
let scoreLogs = JSON.parse(localStorage.getItem("scoreLogs")) || [];

// --- Utility Functions ---

function saveToLocalStorage() {
  localStorage.setItem("todos", JSON.stringify(todos));
  localStorage.setItem("tags", JSON.stringify(tags));
  localStorage.setItem("dailyScore", dailyScore.toString());
  localStorage.setItem("totalScore", totalScore.toString());
  localStorage.setItem("lastScoreUpdateDate", lastScoreUpdateDate);
  // NEW: Save score logs
  localStorage.setItem("scoreLogs", JSON.stringify(scoreLogs));
}

function generateUniqueId() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

function getTodayDateString() {
  const today = new Date();
  // Adjust to local time zone (Patna, Bihar, India is IST, UTC+5:30)
  const offset = today.getTimezoneOffset() * 60000; // Offset in milliseconds
  const localDate = new Date(today.getTime() - offset);
  return localDate.toISOString().split("T")[0]; // YYYY-MM-DD
}

function checkAndResetDailyScore() {
  const today = getTodayDateString();
  const now = new Date();
  const currentHour = now.getHours();

  // Only perform the reset if the date has changed AND it's past 11 PM IST (23:00)
  if (currentHour >= 23 && lastScoreUpdateDate !== today) {
    // NEW: Record the daily score transfer before resetting
    if (dailyScore !== 0) {
      // Only log if there was a score to transfer
      scoreLogs.push({
        date: lastScoreUpdateDate || "N/A",
        pointsTransferred: dailyScore,
      });
      // Keep only the last 7 entries for a concise graph
      if (scoreLogs.length > 7) {
        scoreLogs = scoreLogs.slice(scoreLogs.length - 7);
      }
    }
    totalScore += dailyScore;
    dailyScore = 0;
    lastScoreUpdateDate = today;
    saveToLocalStorage();
    renderScoreLogs(); // NEW: Render updated logs
    console.log("Daily score reset and added to total!");
  }
}

// Function to determine if a color is dark (for text color adjustment)
function isColorDark(hexColor) {
  const c = hexColor.substring(1); // strip #
  const rgb = parseInt(c, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
  return luma < 128; // Adjust threshold as needed
}

// --- Core Todo Management Functions ---

function renderTodos(filteredTodos = todos) {
  const activeTodosContainer = document.getElementById(
    "active-todos-container"
  );
  const completedTodosContainer = document.getElementById(
    "completed-todos-container"
  );
  const tagFilterSelect = document.getElementById("tag-filter-select");

  activeTodosContainer.innerHTML = "";
  completedTodosContainer.innerHTML = "";

  // Populate tag filter options only if they are not already populated
  if (tagFilterSelect.options.length <= 1) {
    // Only 'All Tags' option initially
    populateTagFilter();
  }

  // Update score and date displays
  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById(
    "current-date-display"
  ).textContent = `Today: ${todayDate}`;
  document.getElementById(
    "today-score-display"
  ).textContent = `Today's Score: ${dailyScore}`;
  document.getElementById(
    "total-score-display"
  ).textContent = `Total Score: ${totalScore}`;

  // Separate active and completed todos
  const active = filteredTodos.filter((todo) => !todo.isCompleted);
  const completed = filteredTodos.filter((todo) => todo.isCompleted);

  // Sort active todos: by deadline ascending, then by priority (lower number = higher priority = appears first)
  active.sort((a, b) => {
    const deadlineA = new Date(a.deadline);
    const deadlineB = new Date(b.deadline);
    if (deadlineA.getTime() !== deadlineB.getTime()) {
      return deadlineA - deadlineB; // Sort by deadline first
    }

    // If deadlines are same, sort by priority (lower number = higher priority = appears first)
    const tagA = getTagByName(a.tag);
    const tagB = getTagByName(b.tag);
    const priorityA = tagA ? tagA.priority : 999; // Assign high priority if tag not found
    const priorityB = tagB ? tagB.priority : 999;
    return priorityA - priorityB;
  });

  // Sort completed todos: by completion date descending (most recent completion first)
  completed.sort(
    (a, b) =>
      new Date(b.completedAt || b.createdAt) -
      new Date(a.completedAt || a.createdAt)
  );

  if (active.length === 0) {
    activeTodosContainer.innerHTML =
      '<p style="text-align: center; color: #888;">No active todos for now. Go relax!</p>';
  } else {
    active.forEach((todo) => {
      const todoElement = createTodoElement(todo);
      activeTodosContainer.appendChild(todoElement);
    });
  }

  if (completed.length === 0) {
    completedTodosContainer.innerHTML =
      '<p style="text-align: center; color: #888;">No completed todos yet. Get to work!</p>';
  } else {
    completed.forEach((todo) => {
      const todoElement = createTodoElement(todo, true);
      completedTodosContainer.appendChild(todoElement);
    });
  }
  renderScoreLogs(); // Ensure logs are rendered when todos are rendered
}

function getTagInfoHtml(tagName) {
  const tag = tags.find((t) => t.name === tagName);
  if (tag) {
    const textColor = isColorDark(tag.color) ? "#FFF" : "#000";
    const effectSymbol = tag.effect === "plus" ? "+" : "-";
    return `<span class="tag-display" style="background-color: ${
      tag.color
    }; color: ${textColor};" data-bg-dark="${isColorDark(tag.color)}">
                    ${tag.name} (${effectSymbol}${tag.priority})
                </span>`;
  }
  return tagName; // Fallback if tag not found
}

function createTodoElement(todo) {
  const div = document.createElement("div");
  div.className = `todo-item ${todo.isCompleted ? "completed" : ""}`;

  const tagDetails = getTagByName(todo.tag);
  if (tagDetails) {
    div.style.borderLeftColor = tagDetails.color; // Apply tag color to left border
  } else {
    div.style.borderLeftColor = "#FFFFFF"; // Default if tag not found
  }

  const deadlineDate = new Date(todo.deadline);
  const today = new Date(getTodayDateString()); // Get today's date without time

  let deadlineText = `Deadline: ${todo.deadline}`;
  if (deadlineDate < today && !todo.isCompleted) {
    deadlineText = `<span style="color: #FF6666;">Deadline: ${todo.deadline} (Past Due!)</span>`; // Red for past due
  } else if (
    deadlineDate.toISOString().split("T")[0] ===
      today.toISOString().split("T")[0] &&
    !todo.isCompleted
  ) {
    deadlineText = `<span style="color: #FFFF66;">Deadline: ${todo.deadline} (Today!)</span>`; // Yellow for today
  }

  // Display message for not feasible
  const notFeasibleMsgId = `not-feasible-${todo.id}`;

  div.innerHTML = `
        <h3>${todo.title}</h3>
        <p>${deadlineText}</p>
        <p>Score: ${todo.score}</p>
        <p>Tag: ${getTagInfoHtml(todo.tag)}</p>
        <div class="actions">
            ${
              !todo.isCompleted
                ? `<button onclick="toggleTodoCompletion('${todo.id}')">Complete</button>`
                : `<button onclick="toggleTodoCompletion('${todo.id}')" style="background-color: #555;">Uncomplete</button>`
            }
            <button onclick="deleteTodo('${
              todo.id
            }')" style="background-color: #FF0000;">Delete</button>
        </div>
        <div id="${notFeasibleMsgId}" class="not-feasible-message"></div>
    `;
  return div;
}

function addTodo(title, tag, deadline, score) {
  const newTodo = {
    id: generateUniqueId(),
    title: title,
    tag: tag, // Store as single tag string
    deadline: deadline,
    score: score,
    isCompleted: false, // Starts as not completed
    createdAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  saveToLocalStorage();
  applyFilters(); // Re-render the list with current filters
}

function toggleTodoCompletion(id) {
  const todoIndex = todos.findIndex((todo) => todo.id === id);
  if (todoIndex > -1) {
    const todo = todos[todoIndex];
    const tagDetails = getTagByName(todo.tag);
    const notFeasibleMsgElement = document.getElementById(
      `not-feasible-${todo.id}`
    );

    if (!tagDetails) {
      console.error(`Tag "${todo.tag}" not found for todo "${todo.title}".`);
      return;
    }

    if (todo.isCompleted) {
      // Marking as uncompleted: reverse score effect
      if (tagDetails.effect === "plus") {
        dailyScore -= todo.score;
      } else if (tagDetails.effect === "minus") {
        dailyScore += todo.score; // If it was a minus, uncompleting adds back
      }
      todo.isCompleted = false;
      delete todo.completedAt; // Remove completion timestamp
      if (notFeasibleMsgElement) notFeasibleMsgElement.textContent = ""; // Clear message
    } else {
      // Marking as completed: apply score effect with feasibility check
      if (tagDetails.effect === "minus") {
        if (dailyScore - todo.score < 0) {
          if (notFeasibleMsgElement)
            notFeasibleMsgElement.textContent =
              "Not Feasible! Need more score.";
          return; // Do not complete if not enough score
        } else {
          dailyScore -= todo.score;
          todo.isCompleted = true;
          todo.completedAt = new Date().toISOString(); // Record completion timestamp
          if (notFeasibleMsgElement) notFeasibleMsgElement.textContent = ""; // Clear message
        }
      } else if (tagDetails.effect === "plus") {
        dailyScore += todo.score;
        todo.isCompleted = true;
        todo.completedAt = new Date().toISOString(); // Record completion timestamp
        if (notFeasibleMsgElement) notFeasibleMsgElement.textContent = ""; // Clear message
      }
    }
    saveToLocalStorage();
    applyFilters(); // Re-render to move it to correct section
  }
}

function deleteTodo(id) {
  const todoIndex = todos.findIndex((todo) => todo.id === id);
  if (todoIndex > -1) {
    const todoToDelete = todos[todoIndex];

    if (!todoToDelete.isCompleted) {
      // It's an uncompleted todo, apply confusion penalty
      alert(`Confusion has taken ${CONFUSION_PENALTY} points!`);
      let deductionAmount = CONFUSION_PENALTY;

      // Deduct from dailyScore first
      if (dailyScore >= deductionAmount) {
        dailyScore -= deductionAmount;
      } else {
        // Deduct remaining from totalScore
        const remainingDeduction = deductionAmount - dailyScore;
        dailyScore = 0; // Daily score goes to 0
        totalScore -= remainingDeduction; // Total score takes the hit
      }
    }
    // For completed todos, no further deduction is needed as they've already been accounted for.

    todos.splice(todoIndex, 1);
    saveToLocalStorage();
    applyFilters();
  }
}

// --- Tag Management Functions ---

function addTag(name, color, priority, effect) {
  // Check if tag already exists (case-insensitive)
  if (tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
    alert(`Tag "${name}" already exists.`);
    return false;
  }
  const newTag = { name: name.toLowerCase(), color, priority, effect };
  tags.push(newTag);
  saveToLocalStorage();
  populateTagFilter(); // Re-populate filter dropdown
  return true;
}

function getTagByName(name) {
  return tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
}

function populateTagFilter() {
  const tagFilterSelect = document.getElementById("tag-filter-select");
  const currentSelectedTag = tagFilterSelect.value; // Remember current selection

  tagFilterSelect.innerHTML = '<option value="">All Tags</option>'; // Reset
  tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag.name;
    option.textContent = tag.name;
    tagFilterSelect.appendChild(option);
  });
  tagFilterSelect.value = currentSelectedTag; // Restore selection
}

// --- Filtering Functions ---

function applyFilters() {
  let filtered = [...todos];

  const tagFilter = document.getElementById("tag-filter-select").value;
  const deadlineFilter = document.getElementById(
    "deadline-filter-select"
  ).value;
  const priorityFilter = document.getElementById("priority-sort-select").value; // Get selected priority for filtering

  // Apply tag filter (now for a single tag)
  if (tagFilter) {
    filtered = filtered.filter((todo) => todo.tag === tagFilter);
  }

  // Apply deadline filter
  const today = getTodayDateString();
  if (deadlineFilter === "today") {
    filtered = filtered.filter(
      (todo) => todo.deadline === today && !todo.isCompleted
    );
  } else if (deadlineFilter === "upcoming") {
    // Filter for tasks with a deadline today or in the future
    filtered = filtered.filter(
      (todo) => todo.deadline >= today && !todo.isCompleted
    );
  } else if (deadlineFilter === "past") {
    filtered = filtered.filter(
      (todo) => todo.deadline < today && !todo.isCompleted
    );
  }

  // Apply priority filter
  if (priorityFilter) {
    filtered = filtered.filter((todo) => {
      const tagInfo = getTagByName(todo.tag);
      return tagInfo && tagInfo.priority === parseInt(priorityFilter);
    });
  }

  renderTodos(filtered); // Render the filtered list
}

// NEW: Function to render the score logs as a bar graph
function renderScoreLogs() {
  const scoreLogContainer = document.getElementById("score-log-container");
  scoreLogContainer.innerHTML = ""; // Clear previous bars

  if (scoreLogs.length === 0) {
    scoreLogContainer.innerHTML =
      '<p style="text-align: center; color: #888;">No score transfers recorded yet.</p>';
    return;
  }

  // Determine max score for scaling (e.g., max 100px height for 20 points, 5px per point)
  const maxPoints = Math.max(
    ...scoreLogs.map((log) => log.pointsTransferred),
    1
  ); // Ensure min 1 to avoid division by zero
  const scaleFactor = 100 / maxPoints; // Max height 100px

  scoreLogs.forEach((log) => {
    const barHeight = Math.max(log.pointsTransferred * scaleFactor, 10); // Minimum bar height for visibility
    const bar = document.createElement("div");
    bar.className = "score-bar";
    bar.style.height = `${barHeight}px`;

    const dateString = log.date; // YYYY-MM-DD
    const shortDate = dateString
      ? new Date(dateString).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        })
      : "N/A";

    bar.innerHTML = `
            <span class="score-bar-value">${log.pointsTransferred}</span>
            <span class="score-bar-date">${shortDate}</span>
        `;
    scoreLogContainer.appendChild(bar);
  });
}

// --- UI Display Functions ---

function showNewTodoCreationForm() {
  // Prevent multiple forms
  if (document.querySelector(".overlay-form")) return;

  // Dynamically create tag options for the select dropdown
  let tagOptionsHtml = tags
    .map((tag) => `<option value="${tag.name}">${tag.name}</option>`)
    .join("");
  if (tags.length === 0) {
    tagOptionsHtml =
      '<option value="" disabled>No tags available. Add some first!</option>';
  }

  const formHtml = `
        <div id="new-todo-form-overlay" class="overlay-form">
            <div>
                <h2>New Todo</h2>
                <input type="text" id="new-todo-title" placeholder="Title" required>
                <input type="date" id="new-todo-deadline" required>
                <input type="number" id="new-todo-score" placeholder="Score (e.g., 5)" value="5" min="1" required>
                <select id="new-todo-tag" ${
                  tags.length === 0 ? "disabled" : ""
                }>
                    <option value="" disabled ${
                      tags.length === 0 ? "selected" : ""
                    }>${
    tags.length === 0 ? "No tags available" : "Select a Tag"
  }</option>
                    ${tagOptionsHtml}
                </select>
                <div class="form-actions">
                    <button id="submit-new-todo" class="submit-button" ${
                      tags.length === 0 ? "disabled" : ""
                    }>Add Todo</button>
                    <button id="cancel-new-todo" class="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", formHtml);

  // Set default deadline to today
  document.getElementById("new-todo-deadline").value = getTodayDateString();

  document.getElementById("submit-new-todo").addEventListener("click", () => {
    const title = document.getElementById("new-todo-title").value.trim();
    const deadline = document.getElementById("new-todo-deadline").value;
    const score = parseInt(document.getElementById("new-todo-score").value);
    const selectedTag = document.getElementById("new-todo-tag").value; // Get selected tag

    if (title && deadline && !isNaN(score) && score > 0 && selectedTag) {
      addTodo(title, selectedTag, deadline, score); // Pass single tag
      document.getElementById("new-todo-form-overlay").remove(); // Close the form on submit
    } else {
      alert(
        'Please ensure Title, valid Deadline, a positive Score, and a Tag are selected. (If no tags are available, add some via "Manage Tags" first.)'
      );
    }
  });

  document.getElementById("cancel-new-todo").addEventListener("click", () => {
    document.getElementById("new-todo-form-overlay").remove(); // Close the form on cancel
  });
}

function showAddTagForm() {
  // Prevent multiple forms
  if (document.querySelector(".overlay-form")) return;

  const formHtml = `
        <div id="add-tag-form-overlay" class="overlay-form">
            <div>
                <h2>Add New Tag</h2>
                <input type="text" id="new-tag-name" placeholder="Tag Name (e.g., shopping)" required>
                <label for="new-tag-color">Color:</label>
                <input type="color" id="new-tag-color" value="#00FFFF">
                <label for="new-tag-priority">Priority (1=High, 3=Low):</label>
                <input type="number" id="new-tag-priority" value="2" min="1" max="3" required>
                <div class="radio-group">
                    <label><input type="radio" name="tag-effect" value="plus" checked> Plus (+)</label>
                    <label><input type="radio" name="tag-effect" value="minus"> Minus (-)</label>
                </div>
                <div class="form-actions">
                    <button id="submit-new-tag" class="submit-button">Add Tag</button>
                    <button id="cancel-new-tag" class="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", formHtml);

  document.getElementById("submit-new-tag").addEventListener("click", () => {
    const name = document.getElementById("new-tag-name").value.trim();
    const color = document.getElementById("new-tag-color").value;
    const priority = parseInt(
      document.getElementById("new-tag-priority").value
    );
    const effect = document.querySelector(
      'input[name="tag-effect"]:checked'
    ).value;

    if (name && !isNaN(priority) && priority >= 1 && priority <= 3) {
      if (addTag(name, color, priority, effect)) {
        // addTag returns true if successful
        document.getElementById("add-tag-form-overlay").remove();
        // Re-render todos and update filter options after adding a new tag
        applyFilters();
      }
    } else {
      alert("Please enter a valid tag name and priority (1-3).");
    }
  });

  document.getElementById("cancel-new-tag").addEventListener("click", () => {
    document.getElementById("add-tag-form-overlay").remove();
  });
}

function showPasswordPromptForClearData() {
  // Prevent multiple prompts
  if (document.querySelector(".overlay-form")) return;

  const promptHtml = `
        <div id="password-input-overlay" class="overlay-form">
            <div>
                <h2>Enter Password to Clear Data</h2>
                <input type="password" id="clear-password-input" placeholder="Password">
                <div class="password-actions">
                    <button id="submit-password">Submit</button>
                    <button id="cancel-password">Cancel</button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", promptHtml);

  document.getElementById("submit-password").addEventListener("click", () => {
    const enteredPassword = document.getElementById(
      "clear-password-input"
    ).value;
    if (enteredPassword === CLEAR_DATA_PASSWORD) {
      clearAllData();
      document.getElementById("password-input-overlay").remove();
    } else {
      alert("Incorrect password!");
      document.getElementById("clear-password-input").value = ""; // Clear input
    }
  });

  document.getElementById("cancel-password").addEventListener("click", () => {
    document.getElementById("password-input-overlay").remove();
  });
}

function clearAllData() {
  if (
    confirm(
      "Are you absolutely sure you want to clear ALL data? This cannot be undone."
    )
  ) {
    localStorage.clear();
    todos = [];
    tags = [
      // Academic Tags
      { name: "study", color: "#FFD700", priority: 1, effect: "plus" }, // Gold
      { name: "assignment", color: "#00BFFF", priority: 2, effect: "plus" }, // Deep Sky Blue
      { name: "lecture", color: "#90EE90", priority: 3, effect: "plus" }, // Light Green

      // Personal & Growth Tags
      { name: "self-care", color: "#FF69B4", priority: 2, effect: "plus" }, // Hot Pink
      { name: "skill-dev", color: "#8A2BE2", priority: 1, effect: "plus" }, // Blue Violet

      // Entertainment & Other Negative Tags
      { name: "gaming", color: "#FF4500", priority: 3, effect: "minus" }, // Orange Red
      { name: "social media", color: "#FF0000", priority: 3, effect: "minus" }, // Red
      { name: "streaming", color: "#800080", priority: 3, effect: "minus" }, // Purple
      {
        name: "procrastination",
        color: "#FFFF00",
        priority: 1,
        effect: "minus",
      }, // Yellow
      { name: "unplanned", color: "#696969", priority: 3, effect: "minus" }, // Dim Gray
    ];
    dailyScore = 0;
    totalScore = 0;
    lastScoreUpdateDate = "";
    scoreLogs = []; // NEW: Clear score logs
    applyFilters(); // Re-render to show empty state
    alert("All data cleared!");
  }
}

// --- Event Listeners and Initialization ---

document.addEventListener("DOMContentLoaded", () => {
  checkAndResetDailyScore(); // Perform daily score reset check on load
  populateTagFilter(); // Ensure tag filter is populated on load
  applyFilters(); // Initial render of todos with default filters
  renderScoreLogs(); // NEW: Initial render of score logs

  // Event listener for the new "Add Todo" floating button
  document
    .getElementById("add-todo-button")
    .addEventListener("click", showNewTodoCreationForm);

  // Event listener for "Manage Tags" button
  document
    .getElementById("manage-tags-button")
    .addEventListener("click", showAddTagForm);

  // Add event listener for the "Clear All Data" button
  document
    .getElementById("clear-all-data-button")
    .addEventListener("click", showPasswordPromptForClearData);

  // Add change listeners for filters to apply immediately
  document
    .getElementById("tag-filter-select")
    .addEventListener("change", applyFilters);
  document
    .getElementById("deadline-filter-select")
    .addEventListener("change", applyFilters);
  document
    .getElementById("priority-sort-select")
    .addEventListener("change", applyFilters); // Changed to priority sort
});
