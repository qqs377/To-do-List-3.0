// Constants
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

// Task functions
async function loadTasks() {
    try {
        const { data: tasks, error } = await supabase
            .from('tasks_v3')
            .select(`
                *, 
                users_v3(username),
                tags_v3(color, tag_name)
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;

        window.allTasks = tasks; // Store for filtering
        filterTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function loadUserTags() {
    if (!currentUser) return;
    
    try {
        const { data: tags, error } = await supabase
            .from('tags_v3')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        // Create default tags if they don't exist
        const existingColors = tags.map(tag => tag.color);
        const missingColors = colors.filter(color => !existingColors.includes(color));
        
        if (missingColors.length > 0) {
            const defaultTags = missingColors.map(color => ({
                user_id: currentUser.id,
                color: color,
                tag_name: getDefaultTagName(color)
            }));
            
            await supabase.from('tags_v3').insert(defaultTags);
            return loadUserTags(); // Reload after creating defaults
        }
        
        window.userTags = tags;
        return tags;
    } catch (error) {
        console.error('Error loading user tags:', error);
    }
}

function getDefaultTagName(color) {
    const defaultNames = {
        '#FF6B6B': 'Priority',
        '#4ECDC4': 'Work',
        '#45B7D1': 'Personal',
        '#96CEB4': 'Health',
        '#FFEAA7': 'Learning',
        '#DDA0DD': 'Fun',
        '#98D8C8': 'Other'
    };
    return defaultNames[color] || 'Unnamed';
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
            // Sort by priority: red tags first, then by creation date
            filteredTasks.sort((a, b) => {
                const aIsRed = a.tags_v3?.color === '#FF6B6B';
                const bIsRed = b.tags_v3?.color === '#FF6B6B';
                
                if (aIsRed && !bIsRed) return -1;
                if (!aIsRed && bIsRed) return 1;
                
                return new Date(a.created_at) - new Date(b.created_at);
            });
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
        
        // Create tag element
        const tagColor = task.tags_v3?.color || '#CCCCCC';
        const tagName = task.tags_v3?.tag_name || 'No Tag';
        
        li.innerHTML = `
            ${canModify ? `<button class="done" onclick="markDone(this.parentNode)">✓</button>` : ''}
            ${canModify ? `<button class="remove" onclick="removeTask(this.parentNode)">✕</button>` : ''}
            ${canModify ? createTagSelector(task.tag_id, tagColor) : `<div class="tag-display" style="background-color: ${tagColor}">${tagName}</div>`}
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
            
            // Add tag functionality
            setupTagSelector(li, task.id, task.tag_id);
        }

        tasksList.appendChild(li);
    });
}

function createTagSelector(currentTagId, currentColor) {
    return `
        <div class="tag-selector">
            <div class="tag-color" style="background-color: ${currentColor}" data-tag-id="${currentTagId || ''}">
                <div class="tag-dropdown">
                    ${colors.map(color => `
                        <div class="tag-option" style="background-color: ${color}" data-color="${color}"></div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function setupTagSelector(taskElement, taskId, currentTagId) {
    const tagColor = taskElement.querySelector('.tag-color');
    const dropdown = taskElement.querySelector('.tag-dropdown');
    
    // Toggle dropdown on click
    tagColor.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    // Handle tag option selection
    dropdown.addEventListener('click', async (e) => {
        if (e.target.classList.contains('tag-option')) {
            e.stopPropagation();
            const selectedColor = e.target.dataset.color;
            await updateTaskTag(taskId, selectedColor);
            dropdown.classList.remove('show');
        }
    });
    
    // Handle tag name editing (double-click)
    tagColor.addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        if (currentTagId) {
            await editTagName(currentTagId, tagColor);
        }
    });
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });
}

async function updateTaskTag(taskId, color) {
    try {
        // Find the tag ID for this color
        const userTag = window.userTags?.find(tag => tag.color === color);
        if (!userTag) {
            console.error('Tag not found for color:', color);
            return;
        }
        
        const { error } = await supabase
            .from('tasks_v3')
            .update({ tag_id: userTag.id })
            .eq('id', taskId);

        if (error) throw error;

        loadTasks(); // Reload to show updated tag
    } catch (error) {
        console.error('Error updating task tag:', error);
    }
}

async function editTagName(tagId, tagElement) {
    const currentTag = window.userTags?.find(tag => tag.id === tagId);
    if (!currentTag) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTag.tag_name;
    input.className = 'tag-edit-input';
    input.style.position = 'absolute';
    input.style.top = '0';
    input.style.left = '0';
    input.style.width = '100px';
    input.style.zIndex = '1000';
    input.style.border = '1px solid #ccc';
    input.style.padding = '2px 4px';
    input.style.fontSize = '12px';
    
    tagElement.appendChild(input);
    input.focus();
    input.select();
    
    const saveEdit = async () => {
        const newName = input.value.trim();
        
        if (!newName) {
            alert('Tag name cannot be empty!');
            input.focus();
            return;
        }
        
        if (newName === currentTag.tag_name) {
            cancelEdit();
            return;
        }
        
        try {
            const { error } = await supabase
                .from('tags_v3')
                .update({ tag_name: newName })
                .eq('id', tagId);

            if (error) throw error;

            // Update local cache
            currentTag.tag_name = newName;
            cancelEdit();
            loadTasks(); // Reload to show updated name
            
        } catch (error) {
            console.error('Error updating tag name:', error);
            alert('Failed to update tag name. Please try again.');
            input.focus();
        }
    };
    
    const cancelEdit = () => {
        if (tagElement.contains(input)) {
            tagElement.removeChild(input);
        }
    };
    
    input.addEventListener('blur', () => {
        setTimeout(saveEdit, 100);
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
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
                is_done: false,
                tag_id: null // Default to no tag
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

// Initialize tags when user logs in
async function initializeTags() {
    if (currentUser) {
        await loadUserTags();
    }
}

// Affirmation functions
function getRandomAffirmation() {
    const randomIndex = Math.floor(Math.random() * affirmations.length);
    return affirmations[randomIndex];
}

function showAffirmation() {
    const affirmationText = getRandomAffirmation();
    
    const affirmationElement = document.createElement('div');
    affirmationElement.classList.add('affirmation');
    affirmationElement.textContent = affirmationText;

    document.body.appendChild(affirmationElement);

    setTimeout(() => {
        affirmationElement.classList.add('fadeOut');
        setTimeout(() => {
            affirmationElement.remove();
        }, 1000);
    }, 2000);
}
