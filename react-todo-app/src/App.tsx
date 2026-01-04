import { useState, useEffect } from 'react';
import './App.css';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  category: 'work' | 'personal' | 'other';
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [category, setCategory] = useState<'work' | 'personal' | 'other'>('personal');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false,
        category,
      };
      setTodos([...todos, newTodo]);
      setInputValue('');
      setCategory('personal');
    }
  };

  const toggleComplete = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEditing = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (editingId !== null && editText.trim()) {
      setTodos(
        todos.map(todo =>
          todo.id === editingId ? { ...todo, text: editText.trim() } : todo
        )
      );
      setEditingId(null);
      setEditText('');
    }
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingId !== null) {
        saveEdit();
      } else {
        addTodo();
      }
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>TodoList</h1>
        
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">全部</span>
            <span className="stat-count">{todos.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">进行中</span>
            <span className="stat-count active">{activeCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已完成</span>
            <span className="stat-count completed">{completedCount}</span>
          </div>
        </div>

        <div className="input-group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="添加新的待办事项..."
            className="todo-input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'work' | 'personal' | 'other')}
            className="category-select"
          >
            <option value="personal">个人</option>
            <option value="work">工作</option>
            <option value="other">其他</option>
          </select>
          <button onClick={addTodo} className="add-btn">
            添加
          </button>
        </div>

        <div className="filters">
          <button 
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            全部
          </button>
          <button 
            onClick={() => setFilter('active')}
            className={filter === 'active' ? 'active' : ''}
          >
            进行中
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={filter === 'completed' ? 'active' : ''}
          >
            已完成
          </button>
        </div>

        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''} ${todo.category}`}
            >
              {editingId === todo.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                  className="edit-input"
                />
              ) : (
                <>
                  <div className="todo-content" onClick={() => toggleComplete(todo.id)}>
                    <span className="checkbox">{todo.completed && '✓'}</span>
                    <span className="todo-text">{todo.text}</span>
                  </div>
                  <div className="todo-actions">
                    <button 
                      onClick={() => startEditing(todo.id, todo.text)}
                      className="edit-btn"
                    >
                      编辑
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="delete-btn"
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {filteredTodos.length === 0 && (
          <p className="empty-state">
            {filter === 'all' 
              ? '暂无待办事项' 
              : filter === 'active' 
                ? '暂无进行中的任务' 
                : '暂无已完成的任务'}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;