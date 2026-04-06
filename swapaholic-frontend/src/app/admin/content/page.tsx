'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { 
    FaBold, FaItalic, FaUnderline, FaHeading, 
    FaListUl, FaListOl, FaQuoteLeft, FaUndo, FaRedo, FaEraser,
    FaInfoCircle
} from 'react-icons/fa';

interface ContentSection {
    type: string;
    title: string;
    body: string;
    lastUpdated?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Bold"
            >
                <FaBold />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Italic"
            >
                <FaItalic />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Underline"
            >
                <FaUnderline />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Heading 1"
            >
                <span className="font-bold text-xs">H1</span>
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Heading 2"
            >
                <span className="font-bold text-xs">H2</span>
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Heading 3"
            >
                <span className="font-bold text-xs">H3</span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Bullet List"
            >
                <FaListUl />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Ordered List"
            >
                <FaListOl />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                title="Blockquote"
            >
                <FaQuoteLeft />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
            <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-2 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
                title="Undo"
            >
                <FaUndo />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-2 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
                title="Redo"
            >
                <FaRedo />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                className="p-2 rounded hover:bg-gray-200 text-red-500"
                title="Clear Formatting"
            >
                <FaEraser />
            </button>
        </div>
    );
};

export default function ContentManagementPage() {
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'about'>('terms');
    const [content, setContent] = useState<ContentSection | null>(null);
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ title: '', body: '' });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
        ],
        content: '',
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            setFormData(prev => ({ ...prev, body: editor.getHTML() }));
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4 text-black',
            },
        },
    });

    const fetchContent = useCallback(async (type: string) => {
        try {
            setIsDataLoading(true);
            const data = await adminApi.getContent(type);
            setContent(data);
            setFormData({ title: data.title || '', body: data.body || '' });
            if (editor) {
                editor.commands.setContent(data.body || '');
            }
        } catch (err) {
            console.error('Error fetching content:', err);
            toast.error('Failed to load content');
        } finally {
            setIsDataLoading(false);
        }
    }, [editor]);

    useEffect(() => {
        if (isAdmin && editor) {
            fetchContent(activeTab);
        }
    }, [activeTab, isAdmin, editor, fetchContent]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Get the absolute latest content from the editor instance
        const currentBody = editor ? editor.getHTML() : formData.body;
        const submitData = { ...formData, body: currentBody };

        try {
            setIsSaving(true);
            const updated = await adminApi.updateContent(activeTab, submitData);
            setContent(updated);
            toast.success('Content updated successfully');
        } catch (err) {
            console.error('Error saving content:', err);
            toast.error('Failed to save content');
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isAuthLoading || isDataLoading;

    const tabs = [
        { id: 'terms', label: 'Terms of Service' },
        { id: 'privacy', label: 'Privacy Policy' },
        { id: 'about', label: 'About Us' }
    ];

    if (!isAdmin && !isAuthLoading) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Content Management 📝</h1>
                    <p className="mt-2 text-gray-600">Manage static pages and policies with Rich Text support</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 bg-gray-50/50">
                        <nav className="flex -mb-px px-4 gap-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`py-4 px-4 text-center border-b-2 font-semibold text-sm transition-all duration-200 ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-700 bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-8">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                                <p className="text-gray-500 font-medium">Loading content editor...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-8">
                                <div>
                                    <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-2">
                                        Page Title
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none text-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        placeholder="Enter descriptive title..."
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Content Body
                                    </label>
                                    <div className="mt-1 border border-gray-300 rounded-lg shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                        <MenuBar editor={editor} />
                                        <EditorContent 
                                            editor={editor} 
                                            className="bg-white"
                                        />
                                    </div>
                                    <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                                        <FaInfoCircle className="text-indigo-500" />
                                        Use the toolbar for Bold, Italic, Underline, and Headings. Formatting is saved automatically to the content field.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex justify-center items-center py-3 px-8 border border-transparent shadow-md text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Saving Changes...
                                            </>
                                        ) : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) }
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .ProseMirror {
                    min-height: 400px;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
            `}</style>
        </div>
    );
}
