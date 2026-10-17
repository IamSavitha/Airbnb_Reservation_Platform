import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as bookingAPI from '../../services/bookingAPI';

// Async thunks
export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.createBooking(bookingData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create booking');
    }
  }
);

export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.getMyBookings();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const fetchBookingHistory = createAsyncThunk(
  'booking/fetchBookingHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.getBookingHistory();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch booking history');
    }
  }
);

// ✅ 新增：取消 booking
export const cancelBooking = createAsyncThunk(
  'booking/cancelBooking',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.cancelBooking(bookingId);
      return { bookingId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel booking');
    }
  }
);

export const addFavorite = createAsyncThunk(
  'booking/addFavorite',
  async (propertyId, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.addToFavorites(propertyId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add favorite');
    }
  }
);

export const removeFavorite = createAsyncThunk(
  'booking/removeFavorite',
  async (propertyId, { rejectWithValue }) => {
    try {
      await bookingAPI.removeFromFavorites(propertyId);
      return propertyId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove favorite');
    }
  }
);

export const fetchFavorites = createAsyncThunk(
  'booking/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.getFavorites();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch favorites');
    }
  }
);

const initialState = {
  bookings: [],
  history: [],
  favorites: [],
  currentBooking: null,
  loading: false,
  error: null,
  successMessage: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        const booking = action.payload.booking || action.payload;
        state.currentBooking = booking;
        state.bookings.unshift(booking);
        state.successMessage = 'Booking created successfully!';
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch bookings
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload.bookings || action.payload;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch booking history
      .addCase(fetchBookingHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.bookings || action.payload.history || action.payload;
      })
      .addCase(fetchBookingHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // ✅ Cancel booking
      .addCase(cancelBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.loading = false;
        // Update booking status to 'cancelled'
        const bookingId = action.payload.bookingId;
        const bookingIndex = state.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex !== -1) {
          state.bookings[bookingIndex].status = 'cancelled';
        }
        state.successMessage = 'Booking cancelled successfully!';
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add favorite
      .addCase(addFavorite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addFavorite.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.favorite) {
          state.favorites.push(action.payload.favorite);
        }
        state.successMessage = 'Added to favorites!';
      })
      .addCase(addFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove favorite
      .addCase(removeFavorite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFavorite.fulfilled, (state, action) => {
        state.loading = false;
        const removedPropertyId = parseInt(action.payload);
        state.favorites = state.favorites.filter(
          (fav) => {
            const favPropertyId = fav.propertyId || fav.property_id || fav.id;
            return parseInt(favPropertyId) !== removedPropertyId;
          }
        );
        state.successMessage = 'Removed from favorites!';
      })
      .addCase(removeFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch favorites
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.favorites || action.payload;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  clearCurrentBooking, 
  clearError, 
  clearSuccessMessage 
} = bookingSlice.actions;

export default bookingSlice.reducer;
