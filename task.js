// Task functions
async function loadTasks() {
    try {
        const { data: tasks, error } = await supabase
            .from('tasks_v3')
            .select('*, users_v3(username)')
            .order('created_at', { ascending: true });

        if (error) throw error;

        window.allTasks = tasks; // Store for filtering
        filterTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function loadUserFilter() {
    try {
        const { data: users, error } = await supabase
            .from('users_v3')
            .select('username')
            .order('username');

        if (error) throw error;

        const userSelect = document.getElementById('userFilter');
        userSelect.innerHTML = '<option value="">Filter by tech...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading user filter:', error);
    }
}

function filterTasks() {
    if (!window.allTasks) return;
    
    let filteredTasks = window.allTasks;
    
    switch (currentTaskFilter) {
        case 'my':
            filteredTasks = window.allTasks.filter(task => task.user_id === currentUser.id);
            break;
        case 'others':
            filteredTasks = window.allTasks.filter(task => task.user_id !== currentUser.id);
            break;
        case 'user':
            if (currentUserFilter) {
                filteredTasks = window.allTasks.filter(task => task.users_v3.username === currentUserFilter);
            }
            break;
        case 'all':
        default:
            filteredTasks = window.allTasks;
            break;
    }
    
    displayTasks(filteredTasks);
}

function displayTasks(tasks) {
    const tasksList = document.getElementById('tasks');
    tasksList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        
        const canModify = currentUser && task.user_id === currentUser.id;
        
        li.innerHTML = `
            ${canModify ? `<button class="done" onclick="markDone(this.parentNode)">✓</button>` : ''}
            ${canModify ? `<button class="remove" onclick="removeTask(this.parentNode)">✕</button>` : ''}
            <span class="task-content">${task.task_text}</span>
            <span class="task-owner">by ${task.users_v3.username}</span>
        `;

        if (task.is_done) {
            li.classList.add('finished');
        }

        // Add double-click event listener for editing (only for user's own tasks)
        if (canModify) {
            const taskContentSpan = li.querySelector('.task-content');
            taskContentSpan.addEventListener('dblclick', function() {
                editTask(li, task.id, task.task_text);
            });
            taskContentSpan.style.cursor = 'pointer';
            taskContentSpan.title = 'Double-click to edit';
        }

        tasksList.appendChild(li);
    });
}

// New function to handle task editing
async function editTask(taskElement, taskId, currentText) {
    const taskContentSpan = taskElement.querySelector('.task-content');
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'task-edit-input';
    
    // Style the input to match the span
    input.style.border = '1px solid #ccc';
    input.style.padding = '2px 4px';
    input.style.fontSize = 'inherit';
    input.style.fontFamily = 'inherit';
    input.style.width = '200px';
    input.style.backgroundColor = '#fff';
    
    // Replace span with input
    taskContentSpan.style.display = 'none';
    taskElement.insertBefore(input, taskContentSpan);
    
    // Focus and select all text
    input.focus();
    input.select();
    
    // Function to save changes
    const saveEdit = async () => {
        const newText = input.value.trim();
        
        if (!newText) {
            alert('Task cannot be empty!');
            input.focus();
            return;
        }
        
        if (newText === currentText) {
            // No changes made, just cancel
            cancelEdit();
            return;
        }
        
        try {
            const { error } = await supabase
                .from('tasks_v3')
                .update({ task_text: newText })
                .eq('id', taskId);

            if (error) throw error;

            // Update the display
            taskContentSpan.textContent = newText;
            cancelEdit();
            
            // Optionally reload tasks to ensure consistency
            // loadTasks();
            
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again.');
            input.focus();
        }
    };
    
    // Function to cancel editing
    const cancelEdit = () => {
        taskElement.removeChild(input);
        taskContentSpan.style.display = '';
        input.removeEventListener('blur', handleBlur);
        input.removeEventListener('keydown', handleKeydown);
    };
    
    // Handle blur (clicking outside)
    const handleBlur = (e) => {
        // Small delay to allow click events to process first
        setTimeout(() => {
            if (document.contains(input)) {
                saveEdit();
            }
        }, 100);
    };
    
    // Handle keyboard events
    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };
    
    // Add event listeners
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeydown);
}


async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();

    if (!taskText) {
        alert('Please enter a task!');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('tasks_v3')
            .insert([{
                user_id: currentUser.id,
                task_text: taskText,
                is_done: false
            }])
            .select();

        if (error) throw error;

        taskInput.value = '';
        loadTasks();
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
    }
}

async function markDone(taskElement) {
    const taskId = taskElement.dataset.taskId;
    const isDone = !taskElement.classList.contains('finished');

    try {
        const { error } = await supabase
            .from('tasks_v3')
            .update({ is_done: isDone })
            .eq('id', taskId);

        if (error) throw error;

        if (isDone) {
            // Increment task completion count
            await supabase
                .from('users_v3')
                .update({ 
                    tasks_completed: currentUser.tasks_completed + 1,
                    week_count_task: currentUser.week_count_task + 1,
                    day_count_task: currentUser.day_count_task + 1
                })
                .eq('id', currentUser.id);
            
            currentUser.tasks_completed++;
            currentUser.week_count_task++;
            currentUser.day_count_task++;
            showAffirmation();
        }

        loadTasks();
        loadLeaderboards();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function removeTask(taskElement) {
    const taskId = taskElement.dataset.taskId;

    try {
        const { error } = await supabase
            .from('tasks_v3')
            .delete()
            .eq('id', taskId);

        if (error) throw error;

        loadTasks();
    } catch (error) {
        console.error('Error removing task:', error);
    }
}
